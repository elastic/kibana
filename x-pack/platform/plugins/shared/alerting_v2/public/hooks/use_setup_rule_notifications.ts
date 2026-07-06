/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { WorkflowApi } from '@kbn/workflows-ui';
import {
  buildInlineWorkflowYaml,
  selectRuleSimpleActionPolicies,
  buildRuleScopedMatcher,
  getRuleNotificationDraftsQueryKey,
  type ActionDraft,
  type ActionDraftOrigin,
  type RuleScopedSimpleActionPolicy,
} from '@kbn/alerting-v2-rule-form';
import { ActionPoliciesApi } from '../services/action_policies_api';
import type { RuleApiResponse } from '../services/rules_api';

export interface SetupRuleNotificationsParams {
  rule: RuleApiResponse;
  actions: ActionDraft[];
  /**
   * When true, reconcile the rule's simple-action policies against `actions`:
   * create drafts the user added, update the ones populated from existing policies in place,
   * and delete the policies whose rows were removed.
   * When false (creating), every draft is created.
   */
  onUpdate?: boolean;
}

const workflowRequiredError = () =>
  i18n.translate('xpack.alertingV2.useSetupRuleNotifications.workflowRequiredError', {
    defaultMessage: 'A workflow must be selected when notifications are enabled.',
  });

export const useSetupRuleNotifications = () => {
  const workflowApi = useService(WorkflowApi);
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rule, actions, onUpdate = false }: SetupRuleNotificationsParams) => {
      const matcher = buildRuleScopedMatcher(rule.id);
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
            throw new Error(workflowRequiredError());
          }
          workflowId = action.workflowId;
        }

        try {
          await actionPoliciesApi.createActionPolicy({
            name: `${rule.metadata.name} notifications`,
            description: `Notifications for rule "${rule.metadata.name}"`,
            matcher,
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
      const updateOne = async (action: ActionDraft): Promise<void> => {
        const { origin } = action;
        if (!origin) return;

        if (action.source === 'inline') {
          await workflowApi.updateWorkflow(origin.workflowId, {
            yaml: buildInlineWorkflowYaml(action),
          });
          return;
        }

        if (!action.workflowId) {
          throw new Error(workflowRequiredError());
        }
        if (action.workflowId === origin.workflowId) return;

        const current = await actionPoliciesApi.getActionPolicy(origin.policyId);
        if (!current.version) {
          throw new Error(
            i18n.translate('xpack.alertingV2.useSetupRuleNotifications.missingVersionError', {
              defaultMessage:
                'The action policy could not be updated because its version is missing.',
            })
          );
        }
        await actionPoliciesApi.updateActionPolicy(origin.policyId, {
          version: current.version,
          destinations: [{ type: 'workflow', id: action.workflowId }],
        });
      };
      const deleteOne = async (policy: RuleScopedSimpleActionPolicy): Promise<void> => {
        await actionPoliciesApi.deleteActionPolicy(policy.policyId);
      };

      const toSetup = actions.filter((action) => !action.origin);
      const toUpdate = actions.filter(
        (action): action is ActionDraft & { origin: ActionDraftOrigin } => Boolean(action.origin)
      );

      let toDelete: RuleScopedSimpleActionPolicy[] = [];
      if (onUpdate) {
        const { items } = await actionPoliciesApi.matchActionPoliciesForRule(rule.id);
        const existing = selectRuleSimpleActionPolicies(
          items.map((item) => item.actionPolicy),
          rule.id
        );
        const keptPolicyIds = new Set(toUpdate.map((action) => action.origin.policyId));
        toDelete = existing.filter((policy) => !keptPolicyIds.has(policy.policyId));
      }

      const tasks: Array<() => Promise<void>> = [
        ...toSetup.map((action) => () => setupOne(action)),
        ...toUpdate.map((action) => () => updateOne(action)),
        ...toDelete.map((policy) => () => deleteOne(policy)),
      ];

      if (tasks.length === 0) {
        return { created: 0, updated: 0, deleted: 0 };
      }

      const results = await Promise.allSettled(tasks.map((task) => task()));
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (failures.length > 0) {
        const successCount = results.length - failures.length;
        const errorMessages = failures
          .map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
          .join('; ');

        throw new Error(
          i18n.translate('xpack.alertingV2.useSetupRuleNotifications.partialFailureSummary', {
            defaultMessage:
              '{successCount} of {total} action {total, plural, one {policy} other {policies}} saved. Failures: {errors}',
            values: { successCount, total: results.length, errors: errorMessages },
          })
        );
      }

      return { created: toSetup.length, updated: toUpdate.length, deleted: toDelete.length };
    },
    onSuccess: (result) => {
      if (!result) return;
      const { created, updated, deleted } = result;
      const savedCount = created + updated;
      if (savedCount === 0 && deleted === 0) return;

      if (savedCount === 0) {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.useSetupRuleNotifications.removedMessage', {
            defaultMessage:
              '{count} notification action {count, plural, one {policy} other {policies}} removed',
            values: { count: deleted },
          })
        );
        return;
      }

      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.useSetupRuleNotifications.successMessage', {
          defaultMessage:
            '{count} action {count, plural, one {policy} other {policies}} saved successfully',
          values: { count: savedCount },
        })
      );
    },
    onError: (err) => {
      toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.translate('xpack.alertingV2.useSetupRuleNotifications.errorTitle', {
          defaultMessage:
            'Notifications could not be fully configured. The rule was saved but some action policies may not have been updated.',
        }),
      });
    },
    onSettled: (_result, _err, { rule }) => {
      // Drop the caches unconditionally after any reconcile attempt
      queryClient.removeQueries({ queryKey: getRuleNotificationDraftsQueryKey(rule.id) });
      queryClient.removeQueries({ queryKey: ['matchedActionPolicies', rule.id] });
    },
  });
};
