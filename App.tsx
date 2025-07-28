import React, { useState, useCallback } from 'react';
import { GitaVerse } from './types';
import { gitaVerses } from './data/gitaData';
import { getGitaGuidance } from './services/geminiService';

import Header from './components/Header';
import InputForm from './components/InputForm';
import ResponseDisplay from './components/ResponseDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Disclaimer from './components/Disclaimer';
import DonateModal from './components/DonateModal';

const findRelevantVerses = (problem: string): GitaVerse[] => {
  const problemWords = new Set(problem.toLowerCase().match(/\b(\w+)\b/g) || []);
  if (problemWords.size === 0) {
    return [gitaVerses.find(v => v.keywords.includes('general')) || gitaVerses[0]];
  }

  const scoredVerses = gitaVerses.map(verse => {
    const keywordSet = new Set(verse.keywords);
    const intersection = new Set([...problemWords].filter(x => keywordSet.has(x)));
    return { verse, score: intersection.size };
  }).filter(item => item.score > 0);

  if (scoredVerses.length === 0) {
     return [gitaVerses.find(v => v.keywords.includes('general')) || gitaVerses[0]];
  }
  
  scoredVerses.sort((a, b) => b.score - a.score);
  
  return scoredVerses.slice(0, 3).map(item => item.verse);
};


const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [relevantVerses, setRelevantVerses] = useState<GitaVerse[] | null>(null);
  const [error, setError] = useState<string>('');
  const [isDonateModalOpen, setIsDonateModalOpen] = useState<boolean>(false);

  const handleSeekGuidance = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsLoading(true);
    setError('');
    setAiResponse('');
    setRelevantVerses(null);

    try {
      // 1. Retrieval (RAG)
      const verses = findRelevantVerses(userInput);
      setRelevantVerses(verses);

      // 2. Augmentation & Generation (RAG)
      const guidance = await getGitaGuidance(userInput, verses, selectedLanguage);
      setAiResponse(guidance);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userInput, selectedLanguage]);

  return (
    <div className="min-h-screen bg-transparent text-slate-300 flex flex-col">
      <Header onDonateClick={() => setIsDonateModalOpen(true)} />
      <main className="flex-grow container mx-auto px-4">
        <InputForm
          userInput={userInput}
          setUserInput={setUserInput}
          onSubmit={handleSeekGuidance}
          isLoading={isLoading}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />
        <div className="mt-8">
          {isLoading && <LoadingSpinner />}
          {error && (
            <div className="w-full max-w-3xl mx-auto p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">
              <p><strong>Error:</strong> {error}</p>
            </div>
          )}
          {!isLoading && !error && aiResponse && relevantVerses && (
            <ResponseDisplay guidance={aiResponse} verses={relevantVerses} />
          )}
        </div>
      </main>
      <Disclaimer />
      <DonateModal 
        isOpen={isDonateModalOpen} 
        onClose={() => setIsDonateModalOpen(false)} 
      />
    </div>
  );
};

export default App;