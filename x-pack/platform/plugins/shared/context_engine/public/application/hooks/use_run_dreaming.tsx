/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { useState } from 'react';
import type { RunAiIndexDreamingResponse } from '../../../common/dreaming';
import { runAiIndexDreaming } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { getWorkflowExecutionPath } from '../utils/get_workflow_execution_path';
import { latestWorkflowExecutionQueryKey } from './use_latest_workflow_execution';
import { useKibana } from './use_kibana';

export interface UseRunDreamingResult {
  runDreaming: (aiIndexId: string) => void;
  isLoading: boolean;
}

export interface UseRunDreamingOptions {
  onStarted?: (response: RunAiIndexDreamingResponse) => void;
}

const dreamingMainExecution = (
  response: RunAiIndexDreamingResponse
): { workflowId: string; executionId: string } | undefined => {
  const prefix = `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-`;
  const main = response.executions.find(({ workflow_id }) => workflow_id.startsWith(prefix));
  const picked = main ?? response.executions[0];
  if (picked === undefined) {
    return undefined;
  }
  return { workflowId: picked.workflow_id, executionId: picked.execution_id };
};

/** Starts dreaming on demand for an AI index. */
export const useRunDreaming = ({ onStarted }: UseRunDreamingOptions = {}): UseRunDreamingResult => {
  const {
    services: { http, application, notifications },
  } = useKibana();
  const queryClient = useQueryClient();
  const [isRefetching, setIsRefetching] = useState(false);

  const { mutate, isLoading: isMutating } = useMutation<RunAiIndexDreamingResponse, Error, string>({
    mutationFn: (aiIndexId: string) => runAiIndexDreaming(http, { aiIndexId }),
    onSuccess: async (data) => {
      setIsRefetching(true);
      try {
        const workflowIds = [
          ...new Set([...data.executions.map(({ workflow_id }) => workflow_id), ...data.skipped]),
        ];
        await Promise.all(
          workflowIds.map((workflowId) =>
            queryClient.refetchQueries({ queryKey: latestWorkflowExecutionQueryKey(workflowId) })
          )
        );
      } finally {
        setIsRefetching(false);
      }
      onStarted?.(data);

      if (data.failed.length > 0) {
        notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.contextEngine.aiIndexDetail.dreaming.runs.runPartialFailureTitle',
            {
              defaultMessage: 'Some dreaming workflows did not start',
            }
          ),
          text: i18n.translate(
            'xpack.contextEngine.aiIndexDetail.dreaming.runs.runPartialFailureText',
            {
              defaultMessage:
                '{count, plural, one {# workflow failed to start} other {# workflows failed to start}}.',
              values: { count: data.failed.length },
            }
          ),
        });
      }

      if (data.executions.length === 0 && data.skipped.length > 0) {
        notifications.toasts.addInfo({
          title: i18n.translate(
            'xpack.contextEngine.aiIndexDetail.dreaming.runs.alreadyRunningTitle',
            {
              defaultMessage: 'Dreaming is already running',
            }
          ),
        });
        return;
      }

      if (data.executions.length === 0) {
        return;
      }

      const execution = dreamingMainExecution(data);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.runSuccessTitle', {
          defaultMessage: 'Dreaming run started',
        }),
        ...(execution !== undefined && {
          actionProps: {
            primary: {
              children: i18n.translate(
                'xpack.contextEngine.aiIndexDetail.dreaming.runs.runSuccessViewExecution',
                {
                  defaultMessage: 'View execution',
                }
              ),
              href: application.getUrlForApp(WORKFLOWS_APP_ID, {
                path: getWorkflowExecutionPath(execution.workflowId, execution.executionId),
              }),
              'data-test-subj': 'contextViewDreamingExecutionLink',
            },
          },
        }),
      });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.runErrorTitle', {
          defaultMessage: 'Unable to run dreaming',
        }),
        ...(message ? { toastMessage: message } : {}),
      });
    },
  });

  return {
    runDreaming: mutate,
    isLoading: isMutating || isRefetching,
  };
};
