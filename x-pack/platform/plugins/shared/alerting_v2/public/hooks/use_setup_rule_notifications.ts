/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useMutation } from '@kbn/react-query';
import { WorkflowApi } from '@kbn/workflows-ui';
import {
  buildSingleStepWorkflowYaml,
  type SingleStepWorkflowFormValue,
} from '../components/single_step_workflow_form';
import { ActionPoliciesApi } from '../services/action_policies_api';
import type { RuleApiResponse } from '../services/rules_api';

export interface SetupRuleNotificationsParams {
  rule: RuleApiResponse;
  workflow: SingleStepWorkflowFormValue;
}

const resolveWorkflowId = async (
  value: SingleStepWorkflowFormValue,
  workflowApi: WorkflowApi
): Promise<string> => {
  if (value.mode === 'create') {
    const created = await workflowApi.createWorkflow({
      yaml: buildSingleStepWorkflowYaml(value),
    });
    return created.id;
  }
  if (!value.workflowId) {
    throw new Error(
      i18n.translate('xpack.alertingV2.useSetupRuleNotifications.workflowRequiredError', {
        defaultMessage: 'A workflow must be selected when notifications are enabled.',
      })
    );
  }
  return value.workflowId;
};

export const useSetupRuleNotifications = () => {
  const workflowApi = useService(WorkflowApi);
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useMutation({
    mutationFn: async ({ rule, workflow }: SetupRuleNotificationsParams) => {
      const workflowId = await resolveWorkflowId(workflow, workflowApi);
      await actionPoliciesApi.createActionPolicy({
        name: `${rule.metadata.name} notifications`,
        description: `Notifications for rule "${rule.metadata.name}"`,
        type: 'single_rule',
        ruleId: rule.id,
        destinations: [{ type: 'workflow', id: workflowId }],
        groupingMode: 'per_episode',
        throttle: { strategy: 'on_status_change', interval: null },
      });
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.useSetupRuleNotifications.successMessage', {
          defaultMessage: 'Notifications configured successfully',
        })
      );
    },
    onError: (err) => {
      toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.translate('xpack.alertingV2.useSetupRuleNotifications.errorTitle', {
          defaultMessage:
            'Notifications could not be configured. The rule was created but no action policy was linked.',
        }),
      });
    },
  });
};
