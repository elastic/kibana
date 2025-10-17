/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { Conversation } from '@kbn/onechat-common';
import type { EvaluationScore } from '@kbn/onechat-common/chat/conversation';
import { useConversationList } from '../../../hooks/use_conversation_list';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { calculateAverages } from '../utils/calculateEvaluationAverages';

export interface ConversationEvaluationSummary {
  conversationId: string;
  title: string;
  agentId: string;
  createdAt: string;
  averageMetrics: EvaluationScore[];
  qualitativeReview: string;
  recommendations: string;
}

export const useConversationsWithEvals = () => {
  const { conversations } = useConversationList();
  const { conversationsService } = useOnechatServices();
  const [conversationsWithEvals, setConversationsWithEvals] = useState<Conversation[]>([]);
  const [evaluationSummaries, setEvaluationSummaries] = useState<ConversationEvaluationSummary[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!conversations?.length) {
      setConversationsWithEvals([]);
      setEvaluationSummaries([]);
      return;
    }

    const fetchConversations = async () => {
      setIsLoading(true);
      try {
        const conversationPromises = conversations.map((conversation) =>
          conversationsService.get({ conversationId: conversation.id })
        );
        const fetchedConversations = await Promise.all(conversationPromises);
        setConversationsWithEvals(fetchedConversations);

        // Transform conversations to evaluation summaries
        const summaries: ConversationEvaluationSummary[] = fetchedConversations.map(
          (conversation) => {
            // Collect all evaluation scores from all rounds
            const allEvaluationScores: EvaluationScore[] = [];
            conversation.rounds?.forEach((round) => {
              if (round.evaluations) {
                allEvaluationScores.push(...round.evaluations);
              }
            });

            // Calculate averages for this conversation
            const averages = calculateAverages(allEvaluationScores);

            // Convert averages object to EvaluationScore array
            const averageMetrics: EvaluationScore[] = Object.entries(averages).map(
              ([evaluatorId, score]) => ({
                evaluatorId,
                score,
              })
            );

            return {
              conversationId: conversation.id,
              title: conversation.title,
              agentId: conversation.agent_id,
              createdAt: conversation.created_at,
              averageMetrics,
              qualitativeReview: '', // Empty string for now
              recommendations: '', // Empty string for now
            };
          }
        );

        setEvaluationSummaries(summaries);
      } catch (error) {
        // Error fetching conversations with evaluations
        setConversationsWithEvals([]);
        setEvaluationSummaries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [conversations, conversationsService]);

  return {
    conversationsWithEvals,
    evaluationSummaries,
    isLoading,
  };
};
