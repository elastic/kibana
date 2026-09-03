/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { MutateImprovementResponse } from '../../../common/http_api/improvements';
import { approveImprovement, rejectImprovement } from '../api/improvements';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** HTTP status the decision routes use for an improvement someone else decided first. */
const CONFLICT = 409;

interface DecideImprovementVariables {
  improvementId: string;
  /** Only carried by a rejection. */
  reason?: string;
}

const isConflict = (error: Error): boolean =>
  (error as { body?: { statusCode?: number } }).body?.statusCode === CONFLICT;

/**
 * Approves or rejects a single improvement.
 *
 * A 409 means someone else decided it first. That is a state, not a failure: refetching shows the
 * decision that won, which is what the reviewer needs to see, so it is reported as an informational
 * toast rather than an error.
 */
export const useDecideImprovement = (aiIndexId: string) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: contextEngineQueryKeys.improvements.all(aiIndexId),
    });

  const onError = (error: Error, failureTitle: string) => {
    // Refreshes either way: on a conflict to pick up the winning decision, and on a failed apply
    // to pick up the `failed` status the server just recorded.
    invalidate();

    if (isConflict(error)) {
      notifications.toasts.addWarning({
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.conflictTitle', {
          defaultMessage: 'Someone else decided this improvement first',
        }),
        text: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.conflictBody', {
          defaultMessage: 'The list has been refreshed with the decision that was recorded.',
        }),
      });
      return;
    }

    const toastMessage = getErrorMessage(error);
    notifications.toasts.addError(error, {
      title: failureTitle,
      ...(toastMessage ? { toastMessage } : {}),
    });
  };

  const approve = useMutation<MutateImprovementResponse, Error, DecideImprovementVariables>({
    mutationFn: ({ improvementId }) => approveImprovement(http, { aiIndexId, improvementId }),
    onSuccess: invalidate,
    onError: (error) =>
      onError(
        error,
        i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.approveError', {
          defaultMessage: 'Unable to apply the improvement',
        })
      ),
  });

  const reject = useMutation<MutateImprovementResponse, Error, DecideImprovementVariables>({
    mutationFn: ({ improvementId, reason }) =>
      rejectImprovement(http, { aiIndexId, improvementId, reason }),
    onSuccess: invalidate,
    onError: (error) =>
      onError(
        error,
        i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.rejectError', {
          defaultMessage: 'Unable to reject the improvement',
        })
      ),
  });

  return {
    approve: (variables: DecideImprovementVariables) => approve.mutate(variables),
    reject: (variables: DecideImprovementVariables) => reject.mutate(variables),
    /**
     * Which improvement each action is busy on, so a row can show a spinner on the button that was
     * clicked and leave every other row alone.
     */
    approvingId: approve.isLoading ? approve.variables?.improvementId : undefined,
    rejectingId: reject.isLoading ? reject.variables?.improvementId : undefined,
  };
};
