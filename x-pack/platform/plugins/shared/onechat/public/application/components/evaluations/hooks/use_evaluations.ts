/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useConversationId } from '../../../hooks/use_conversation_id';
import type { EvaluationCacheData } from '../../../context/evaluations/evaluations_context';

export const useEvaluations = () => {
  const conversationId = useConversationId();

  const { data: evaluationData } = useQuery<EvaluationCacheData>({
    queryKey: ['evaluations', conversationId],
    // TODO @CHRIS:add queryFn back when fetching from server, defaults to cache only rn
    enabled: !!conversationId,
  });

  return {
    evaluationData,
  };
};
