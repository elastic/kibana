/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { FeedbackChipId } from '@kbn/agent-builder-common';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { queryKeys } from '../query_keys';
import { mutationKeys } from '../mutation_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useToasts } from './use_toasts';

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
  const { addErrorToast } = useToasts();

  const { mutateAsync: submitFeedback, isLoading: isSubmitting } = useMutation({
    mutationKey: mutationKeys.submitRoundFeedback(conversationId, roundId),
    mutationFn: ({ vote, chips, comment }: SubmitFeedbackParams) =>
      conversationsService.submitRoundFeedback({ conversationId, roundId, vote, chips, comment }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) }),
    onError: (error) => addErrorToast({ title: formatAgentBuilderErrorMessage(error) }),
  });

  return { submitFeedback, isSubmitting };
};
