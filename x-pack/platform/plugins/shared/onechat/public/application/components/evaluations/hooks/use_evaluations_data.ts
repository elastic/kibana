/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EvaluatorConfig } from '../../../../../common/http_api/evaluations';
import { useConversationId } from '../../../hooks/use_conversation_id';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { queryKeys } from '../../../query_keys';

export const useEvaluationsData = () => {
  const conversationId = useConversationId();
  const { evaluationsService } = useOnechatServices();
  const queryClient = useQueryClient();

  const evaluatorsQuery = useQuery({
    queryKey: queryKeys.evaluators.list(),
    queryFn: () => evaluationsService.list(),
  });

  const runEvaluations = useMutation({
    mutationFn: async (evaluators: EvaluatorConfig[]) => {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }
      return await evaluationsService.run(conversationId, evaluators);
    },
    onSettled: () => {
      // Invalidate the conversation query to refetch updated conversation data
      // The conversation rounds now include the evaluation results
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.byId(conversationId!),
      });
    },
  });

  return {
    evaluators: evaluatorsQuery.data,
    runEvaluations: runEvaluations.mutateAsync,
  };
};
