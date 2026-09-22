/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { FeedbackChipId } from '@kbn/agent-builder-common';
import { useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

interface UseRoundFeedbackParams {
  conversationId: string;
  roundId: string;
}

interface SubmitFeedbackParams {
  vote: 'up' | 'down' | null;
  chips?: FeedbackChipId[];
  comment?: string;
}

export const useRoundFeedback = ({ conversationId, roundId }: UseRoundFeedbackParams) => {
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useCallback(
    async ({ vote, chips, comment }: SubmitFeedbackParams) => {
      setIsSubmitting(true);
      try {
        await conversationsService.submitRoundFeedback({
          conversationId,
          roundId,
          vote,
          chips,
          comment,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.byId(conversationId),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationsService, conversationId, roundId, queryClient]
  );

  return { submitFeedback, isSubmitting };
};
