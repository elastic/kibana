/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useRunWorkflow } from '@kbn/workflows-ui';
import { getErrorMessage } from '../utils/get_error_message';
import { getWorkflowExecutionPath } from '../utils/get_workflow_execution_path';
import { latestWorkflowExecutionQueryKey } from './use_latest_workflow_execution';
import { useKibana } from './use_kibana';

export interface UseRunAutomationResult {
  runAutomation: (id: string, inputs?: Record<string, unknown>) => void;
  isLoading: boolean;
}

export interface UseRunAutomationOptions {
  onStarted?: (executionId: string) => void;
}

export const useRunAutomation = ({
  onStarted,
}: UseRunAutomationOptions = {}): UseRunAutomationResult => {
  const {
    services: { application, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useRunWorkflow({
    onSuccess: (data, { id: automationId }) => {
      queryClient.invalidateQueries({ queryKey: latestWorkflowExecutionQueryKey(automationId) });
      onStarted?.(data.workflowExecutionId);
      const executionHref = application.getUrlForApp(WORKFLOWS_APP_ID, {
        path: getWorkflowExecutionPath(automationId, data.workflowExecutionId),
      });
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.runSuccessTitle', {
          defaultMessage: 'Workflow run started',
        }),
        actionProps: {
          primary: {
            children: i18n.translate(
              'xpack.contextEngine.aiIndexDetail.automations.runSuccessViewExecution',
              {
                defaultMessage: 'View execution',
              }
            ),
            href: executionHref,
            'data-test-subj': 'contextViewAutomationExecutionLink',
          },
        },
      });
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.automations.runErrorTitle', {
          defaultMessage: 'Unable to run workflow',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  return {
    runAutomation: (id, inputs = {}) => mutate({ id, inputs }),
    isLoading,
  };
};
