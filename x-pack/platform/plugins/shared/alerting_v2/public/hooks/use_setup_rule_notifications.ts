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
import { buildInlineWorkflowYaml, type ActionDraft } from '@kbn/alerting-v2-rule-form';
import { ActionPoliciesApi } from '../services/action_policies_api';
import type { RuleApiResponse } from '../services/rules_api';

export interface SetupRuleNotificationsParams {
  rule: RuleApiResponse;
  actions: ActionDraft[];
}

export const useSetupRuleNotifications = () => {
  const workflowApi = useService(WorkflowApi);
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useMutation({
    mutationFn: async ({ rule, actions }: SetupRuleNotificationsParams) => {
      if (actions.length === 0) {
        return;
      }

      const setupOne = async (action: ActionDraft): Promise<void> => {
        let createdWorkflowId: string | null = null;
        let workflowId: string;

        if (action.source === 'inline') {
          const created = await workflowApi.createWorkflow({
            yaml: buildInlineWorkflowYaml(action),
          });
          workflowId = created.id;
          createdWorkflowId = workflowId;
        } else {
          if (!action.workflowId) {
            throw new Error(
              i18n.translate('xpack.alertingV2.useSetupRuleNotifications.workflowRequiredError', {
                defaultMessage: 'A workflow must be selected when notifications are enabled.',
              })
            );
          }
          workflowId = action.workflowId;
        }

        try {
          await actionPoliciesApi.createActionPolicy({
            name: `${rule.metadata.name} notifications`,
            description: `Notifications for rule "${rule.metadata.name}"`,
            matcher: `rule.id: "${rule.id}"`,
            destinations: [{ type: 'workflow', id: workflowId }],
            groupingMode: 'per_episode',
            throttle: { strategy: 'on_status_change', interval: null },
          });
        } catch (err) {
          if (createdWorkflowId) {
            await workflowApi.deleteWorkflow(createdWorkflowId).catch((deleteErr: unknown) => {
              const orig = err instanceof Error ? err.message : String(err);
              const cleanup = deleteErr instanceof Error ? deleteErr.message : String(deleteErr);
              throw new Error(
                `${orig}. Workflow ${createdWorkflowId} could not be cleaned up: ${cleanup}. Manual cleanup may be required.`
              );
            });
          }
          throw err;
        }
      };

      const results = await Promise.allSettled(actions.map(setupOne));

      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (failures.length > 0) {
        const successCount = results.length - failures.length;
        const errorMessages = failures
          .map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
          .join('; ');

        throw new Error(
          i18n.translate('xpack.alertingV2.useSetupRuleNotifications.partialFailureSummary', {
            defaultMessage:
              '{successCount} of {total} action {successCount, plural, one {policy} other {policies}} created. Failures: {errors}',
            values: {
              successCount,
              total: results.length,
              errors: errorMessages,
            },
          })
        );
      }
    },
    onSuccess: (_, { actions }) => {
      if (actions.length === 0) return;
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.useSetupRuleNotifications.successMessage', {
          defaultMessage:
            '{count} action {count, plural, one {policy} other {policies}} created successfully',
          values: { count: actions.length },
        })
      );
    },
    onError: (err) => {
      toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.translate('xpack.alertingV2.useSetupRuleNotifications.errorTitle', {
          defaultMessage:
            'Notifications could not be fully configured. The rule was created but some action policies may not have been linked.',
        }),
      });
    },
  });
};
