/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { MutateImprovementResponse } from '../../../common/http_api/improvements';
import { approveImprovement, rejectImprovement } from '../api/improvements';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseResolveImprovementOptions {
  aiIndexId: string;
  mutate: (http: HttpStart, args: { improvementId: string }) => Promise<MutateImprovementResponse>;
  errorTitle: string;
  /** Approving writes KIs or workflows, so the panels showing those have to refetch too. */
  invalidatesAiIndex: boolean;
}

const useResolveImprovement = ({
  aiIndexId,
  mutate,
  errorTitle,
  invalidatesAiIndex,
}: UseResolveImprovementOptions) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<MutateImprovementResponse, Error, string>({
    mutationFn: (improvementId) => mutate(http, { improvementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.improvements.all(aiIndexId),
      });
      if (invalidatesAiIndex) {
        queryClient.invalidateQueries({
          queryKey: contextEngineQueryKeys.aiIndex.detail(aiIndexId),
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: contextEngineQueryKeys.aiIndex.kiSummary(aiIndexId),
          exact: true,
        });
      }
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: errorTitle,
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });
};

/** Applies a suggestion. The apply can fail on its own, which lands as `failed` on the record. */
export const useApproveImprovement = (aiIndexId: string) =>
  useResolveImprovement({
    aiIndexId,
    mutate: approveImprovement,
    errorTitle: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.approveError', {
      defaultMessage: 'Unable to apply the suggestion',
    }),
    invalidatesAiIndex: true,
  });

/** Refuses a suggestion, so later runs know not to propose it again. */
export const useRejectImprovement = (aiIndexId: string) =>
  useResolveImprovement({
    aiIndexId,
    mutate: rejectImprovement,
    errorTitle: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.rejectError', {
      defaultMessage: 'Unable to reject the suggestion',
    }),
    invalidatesAiIndex: false,
  });
