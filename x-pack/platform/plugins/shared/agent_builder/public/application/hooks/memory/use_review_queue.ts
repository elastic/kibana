/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useResolveReview = () => {
  const { memoryService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  return useMutation({
    mutationFn: ({
      id,
      action,
      merge_target_id,
    }: {
      id: string;
      action: 'approve' | 'reject' | 'merge';
      merge_target_id?: string;
    }) => memoryService.resolveReview(id, { action, merge_target_id }),
    onSuccess: (_data, { action }) => {
      const actionLabels: Record<string, string> = {
        approve: i18n.translate('xpack.agentBuilder.memory.review.approveSuccess', {
          defaultMessage: 'Memory approved',
        }),
        reject: i18n.translate('xpack.agentBuilder.memory.review.rejectSuccess', {
          defaultMessage: 'Memory rejected',
        }),
        merge: i18n.translate('xpack.agentBuilder.memory.review.mergeSuccess', {
          defaultMessage: 'Memories merged',
        }),
      };
      addSuccessToast({
        title:
          actionLabels[action] ??
          i18n.translate('xpack.agentBuilder.memory.review.actionSuccess', {
            defaultMessage: 'Review action completed',
          }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.reviewQueueAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.review.errorToast', {
          defaultMessage: 'Failed to process review action',
        }),
      });
    },
  });
};
