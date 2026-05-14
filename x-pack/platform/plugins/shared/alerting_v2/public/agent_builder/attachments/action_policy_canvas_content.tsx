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
import { ActionPolicyDefinitionList } from '../../components/action_policy/details_flyout/action_policy_definition_list';
import { paths } from '../../constants';
import { ActionPoliciesApi } from '../../services/action_policies_api';
import { RulesApi } from '../../services/rules_api';
import { WorkflowsApi } from '../../services/workflows_api';
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';

const EMPTY_VALUE = '-';

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
  const workflowsApi = useService(WorkflowsApi);
  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const notifications = useService(CoreStart('notifications'));

  const { data, origin: savedObjectId } = attachment;
  const isPersisted = isPersistedSavedObject(savedObjectId);

  const [mounted, setMounted] = useState(false);
  const [dependenciesReady, setDependenciesReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checks: Array<Promise<{ workflow?: boolean; rule?: boolean }>> = [];
    const abortController = new AbortController();

    const workflowDestinations = (data.destinations ?? []).filter((d) => d.type === 'workflow');
    for (const dest of workflowDestinations) {
      checks.push(
        workflowsApi
          .getWorkflow(dest.id, abortController.signal)
          .then(() => ({ workflow: true }))
          .catch(() => ({ workflow: false }))
      );
    }

    const matcherRuleId = extractRuleIdFromMatcher(data.matcher);
    if (matcherRuleId) {
      checks.push(
        rulesApi
          .getRule(matcherRuleId, abortController.signal)
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
  }, [workflowsApi, rulesApi, data.destinations, data.matcher]);

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
            await actionPoliciesApi.upsertActionPolicy(data.id!, buildActionPolicyPayload(data));
            await updateOrigin(data.id!);
            notifications.toasts.addSuccess(
              i18n.translate('xpack.alertingV2.actionPolicyAttachment.createdSuccess', {
                defaultMessage: 'Policy "{name}" created',
                values: { name: data.name },
              })
            );
          },
        },
      ]);
      return;
    }

    const policyId = savedObjectId;

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
          await actionPoliciesApi.upsertActionPolicy(policyId, buildActionPolicyPayload(data));
          notifications.toasts.addSuccess(
            i18n.translate('xpack.alertingV2.actionPolicyAttachment.updatedSuccess', {
              defaultMessage: 'Policy "{name}" updated',
              values: { name: data.name },
            })
          );
        },
      },
      {
        label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.viewInPolicies', {
          defaultMessage: 'View in Policies',
        }),
        icon: 'popout',
        type: ActionButtonType.OVERFLOW,
        handler: () => {
          application.navigateToUrl(basePath.prepend(paths.actionPolicyEdit(policyId)));
        },
      },
    ]);
  }, [
    mounted,
    isPersisted,
    savedObjectId,
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
      <ActionPolicyDefinitionList
        description={data.description ?? undefined}
        tags={data.tags ?? undefined}
        matcher={data.matcher}
        groupingMode={data.groupingMode ?? undefined}
        groupBy={data.groupBy ?? undefined}
        throttle={data.throttle ?? undefined}
        destinations={data.destinations ?? []}
        resolvedDestinations={data.resolvedDestinations}
      />
    </EuiPanel>
  );
};

const isPersistedSavedObject = (savedObjectId: string | undefined): savedObjectId is string => {
  return Boolean(savedObjectId);
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

const buildActionPolicyPayload = (data: ActionPolicyAttachment['data']) => ({
  name: data.name,
  description: data.description ?? '',
  type: data.type ?? 'global',
  destinations: data.destinations ?? [],
  ...(data.matcher !== undefined ? { matcher: data.matcher ?? undefined } : {}),
  ...(data.groupBy !== undefined ? { groupBy: data.groupBy ?? undefined } : {}),
  ...(data.tags !== undefined ? { tags: data.tags ?? undefined } : {}),
  ...(data.groupingMode !== undefined ? { groupingMode: data.groupingMode ?? undefined } : {}),
  ...(data.throttle !== undefined ? { throttle: data.throttle ?? undefined } : {}),
});
