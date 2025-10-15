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
import { useOnechatServices } from '../../hooks/use_onechat_service';
import type { EvaluatorConfig } from '../../../../common/http_api/evaluations';

export interface EvaluationScores {
  [evaluatorId: string]: number;
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
  const { evaluationsService } = useOnechatServices();

  const triggerEvaluation = async (evaluators: Evaluator[]): Promise<void> => {
    if (!conversationId) {
      return;
    }

    const selectedEvaluatorsConfig: EvaluatorConfig[] = evaluators.map((evaluator) => ({
      evaluatorId: evaluator.id as any,
      customInstructions: evaluator.customInstructions || '',
    }));

    const response = await evaluationsService.run(conversationId, selectedEvaluatorsConfig);

    const evaluationQueryKey = ['evaluations', conversationId];

    const conversationRoundEvaluations = response.results.map((result) => {
      const scores: EvaluationScores = {};

      result.scores.forEach((scoreItem) => {
        scores[scoreItem.evaluatorId] = scoreItem.score;
      });

      return {
        roundId: result.roundId,
        scores,
      };
    });

    queryClient.setQueryData<EvaluationCacheData>(evaluationQueryKey, {
      results: conversationRoundEvaluations,
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
