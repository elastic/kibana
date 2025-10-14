/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Evaluator } from '../../components/evaluations/modal/types';
import { useConversationId } from '../../hooks/use_conversation_id';

export interface EvaluationScores {
  groundedness_score?: number;
  relevance_score?: number;
  recall_score?: number;
  precision_score?: number;
  regex_score?: number;
}

export interface ConversationRoundEvaluation {
  roundId: string;
  scores: EvaluationScores;
}

export interface EvaluationCacheData {
  results: ConversationRoundEvaluation[];
}

interface EvaluationsContextValue {
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
  triggerEvaluation: (evaluators: Evaluator[]) => Promise<void>;
}

const EvaluationsContext = createContext<EvaluationsContextValue | undefined>(undefined);

interface EvaluationsProviderProps {
  children: ReactNode;
}

export const EvaluationsProvider: React.FC<EvaluationsProviderProps> = ({ children }) => {
  const [showThinking, setShowThinking] = useState(false);
  const queryClient = useQueryClient();
  const conversationId = useConversationId();

  const triggerEvaluation = async (evaluators: Evaluator[]): Promise<void> => {
    const formattedEvaluators = evaluators.map((evaluator) => ({
      evaluatorId: evaluator.id,
      customInstructions: evaluator.customInstructions || undefined,
    }));

    // TODO @CHRIS: REPLACE ALL THIS WITH AN API CALL & also update use_evaluations.ts hook to have a queryFn
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        if (conversationId) {
          const evaluationQueryKey = ['evaluations', conversationId];

          const MOCK_ROUND_IDS = [
            '66712ad1-5631-4bf6-8607-21e1e721b14b',
            '6abe5ffc-89f4-4ef3-a3f9-8dd195c45ab1',
            'c0a0d6f9-cd7b-4e2d-98a2-b8510ba5bcaf',
            '5ca69ed4-bdf8-4270-8a1b-3b88e3df9e7b',
          ];

          const MOCK_ROUND_EVALUATIONS = MOCK_ROUND_IDS.map((roundId) => {
            const scores: EvaluationScores = {};

            // Only include scores for evaluators that were selected
            formattedEvaluators.forEach((evaluator) => {
              switch (evaluator.evaluatorId) {
                case 'groundedness':
                  scores.groundedness_score = Math.random();
                  break;
                case 'relevance':
                  scores.relevance_score = Math.random();
                  break;
                case 'recall':
                  scores.recall_score = Math.random();
                  break;
                case 'precision':
                  scores.precision_score = Math.random();
                  break;
                case 'regex':
                  scores.regex_score = Math.random();
                  break;
              }
            });

            return {
              roundId,
              scores,
            };
          });

          queryClient.setQueryData<EvaluationCacheData>(evaluationQueryKey, {
            results: MOCK_ROUND_EVALUATIONS,
          });
        }
        resolve();
      }, 3000);
    });
  };

  const value: EvaluationsContextValue = {
    showThinking,
    setShowThinking,
    triggerEvaluation,
  };

  return <EvaluationsContext.Provider value={value}>{children}</EvaluationsContext.Provider>;
};

export const useEvaluations = (): EvaluationsContextValue => {
  const context = useContext(EvaluationsContext);
  if (context === undefined) {
    throw new Error('useEvaluations must be used within an EvaluationsProvider');
  }
  return context;
};
