/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { WorkflowApi } from '@kbn/workflows-ui';
import { ActionPolicyDefinitionList } from '../../components/action_policy/details_flyout/action_policy_definition_list';
import { paths } from '../../constants';
import { ActionPoliciesApi } from '../../services/action_policies_api';
import { RulesApi } from '../../services/rules_api';
import { attachmentDataToActionPolicyPayload } from '../../../common/agent_builder/action_policy_mappers';
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';

const EMPTY_VALUE = '-';

type ActionPolicyCanvasData = ActionPolicyAttachment['data'] & { id: string; name: string };

export interface ActionPolicyCanvasContentProps
  extends AttachmentRenderProps<ActionPolicyAttachment>,
    CanvasRenderCallbacks {}

export const ActionPolicyCanvasContent = ({
  attachment,
  registerActionButtons,
  updateOrigin,
}: ActionPolicyCanvasContentProps) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const rulesApi = useService(RulesApi);
  const workflowApi = useService(WorkflowApi);
  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const notifications = useService(CoreStart('notifications'));

  const { data: rawData, origin } = attachment;
  const data = rawData as ActionPolicyCanvasData;
  // Origin is only set if the action policy has been persisted
  const isPersisted = Boolean(origin);

  const [mounted, setMounted] = useState(false);
  const [dependenciesReady, setDependenciesReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checks: Array<Promise<{ workflow?: boolean; rule?: boolean }>> = [];
    const abortController = new AbortController();

    const workflowDestinations = (data.destinations ?? []).filter((d) => d.type === 'workflow');
    for (const dest of workflowDestinations) {
      checks.push(
        workflowApi
          .getWorkflow(dest.id)
          .then(() => ({ workflow: true }))
          .catch(() => ({ workflow: false }))
      );
    }

    const linkedRuleId = extractRuleIdFromMatcher(data.matcher);
    if (linkedRuleId) {
      checks.push(
        rulesApi
          .getRule(linkedRuleId, abortController.signal)
          .then(() => ({ rule: true }))
          .catch(() => ({ rule: false }))
      );
    }

    if (checks.length === 0) {
      setDependenciesReady(true);
      return;
    }

    setDependenciesReady(null);

    Promise.all(checks).then((results) => {
      if (!abortController.signal.aborted) {
        setDependenciesReady(results.every((result) => result.workflow || result.rule));
      }
    });

    return () => {
      abortController.abort();
    };
  }, [workflowApi, rulesApi, data.destinations, data.matcher]);

  const hasDraftDependencies = dependenciesReady !== true;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      registerActionButtons([]);
      return;
    }

    if (!isPersisted) {
      registerActionButtons([
        {
          label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.createPolicy', {
            defaultMessage: 'Create policy',
          }),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          disabled: hasDraftDependencies,
          disabledReason: hasDraftDependencies
            ? i18n.translate('xpack.alertingV2.actionPolicyAttachment.saveRuleAndWorkflowFirst', {
                defaultMessage: 'Save rule and workflow before saving policy.',
              })
            : undefined,
          handler: async () => {
            try {
              await actionPoliciesApi.upsertActionPolicy(
                data.id,
                attachmentDataToActionPolicyPayload(data)
              );
              await updateOrigin(data.id);
              notifications.toasts.addSuccess(
                i18n.translate('xpack.alertingV2.actionPolicyAttachment.createdSuccess', {
                  defaultMessage: 'Policy "{name}" created',
                  values: { name: data.name },
                })
              );
            } catch (e) {
              notifications.toasts.addDanger(
                i18n.translate('xpack.alertingV2.actionPolicyAttachment.createError', {
                  defaultMessage: 'Failed to create policy: {error}',
                  values: { error: e.body?.message ?? e.message },
                })
              );
            }
          },
        },
      ]);
      return;
    }

    registerActionButtons([
      {
        label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.updatePolicy', {
          defaultMessage: 'Update Policy',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        disabled: hasDraftDependencies,
        disabledReason: hasDraftDependencies
          ? i18n.translate('xpack.alertingV2.actionPolicyAttachment.saveWorkflowFirst', {
              defaultMessage: 'Save workflow before saving policy.',
            })
          : undefined,
        handler: async () => {
          try {
            await actionPoliciesApi.upsertActionPolicy(
              data.id,
              attachmentDataToActionPolicyPayload(data)
            );
            notifications.toasts.addSuccess(
              i18n.translate('xpack.alertingV2.actionPolicyAttachment.updatedSuccess', {
                defaultMessage: 'Policy "{name}" updated',
                values: { name: data.name },
              })
            );
          } catch (e) {
            notifications.toasts.addDanger(
              i18n.translate('xpack.alertingV2.actionPolicyAttachment.updateError', {
                defaultMessage: 'Failed to update policy: {error}',
                values: { error: e.body?.message ?? e.message },
              })
            );
          }
        },
      },
      {
        label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.viewInPolicies', {
          defaultMessage: 'View in Policies',
        }),
        icon: 'popout',
        type: ActionButtonType.OVERFLOW,
        handler: () => {
          application.navigateToUrl(basePath.prepend(paths.actionPolicyEdit(data.id)));
        },
      },
    ]);
  }, [
    mounted,
    isPersisted,
    registerActionButtons,
    updateOrigin,
    actionPoliciesApi,
    application,
    basePath,
    notifications,
    data,
    hasDraftDependencies,
  ]);

  return (
    <EuiPanel paddingSize="l" hasShadow={false}>
      <EuiTitle size="s">
        <h2>{data.name ?? EMPTY_VALUE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ActionPolicyDefinitionList policy={data} />
    </EuiPanel>
  );
};

/**
 * Extracts a rule ID from a KQL matcher string if it contains a `rule.id` clause.
 * Supports both quoted (`rule.id: "abc"`) and unquoted (`rule.id: abc`) values.
 * Returns `undefined` when the matcher is absent or doesn't reference `rule.id`.
 */
const extractRuleIdFromMatcher = (matcher: string | null | undefined): string | undefined => {
  if (!matcher) return undefined;
  const match = matcher.match(/rule\.id\s*:\s*"?([^"\s]+)"?/);
  return match?.[1];
};
