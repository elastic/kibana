/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ComposeDiscoverFlyout } from '@kbn/alerting-v2-rule-form';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../services/rules_api';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';
import {
  createSingleStepWorkflowFormService,
  type SingleStepWorkflowFormValue,
} from '../components/single_step_workflow_form';
import { WorkflowsApi } from '../services/workflows_api';
import { ActionPoliciesApi } from '../services/action_policies_api';

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
}

const resolveWorkflowId = async (
  value: SingleStepWorkflowFormValue,
  workflowsApi: WorkflowsApi
): Promise<string> => {
  if (value.mode === 'create') {
    const created = await workflowsApi.createWorkflow(value);
    return created.id;
  }
  if (!value.workflowId) {
    throw new Error(
      i18n.translate('xpack.alertingV2.useComposeDiscoverFlyout.workflowRequiredError', {
        defaultMessage: 'A workflow must be selected when notifications are enabled.',
      })
    );
  }
  return value.workflowId;
};

export const useComposeDiscoverFlyout = ({
  createSuccessRedirectPath,
}: UseComposeDiscoverFlyoutOptions = {}) => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  const workflowsApi = useService(WorkflowsApi);
  const actionPoliciesApi = useService(ActionPoliciesApi);

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [editRule, setEditRule] = useState<RuleApiResponse | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo<RuleFormServices<SingleStepWorkflowFormValue>>(
    () => ({
      http,
      data,
      dataViews,
      notifications,
      application,
      lens,
      workflowForm: createSingleStepWorkflowFormService(),
    }),
    [http, data, dataViews, notifications, application, lens]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setEditRule(null);
  }, []);

  const openCreateFlyout = useCallback(() => {
    setEditRule(null);
    setFlyoutOpen(true);
  }, []);

  const openEditFlyout = useCallback((rule: RuleApiResponse) => {
    setEditRule(rule);
    setFlyoutOpen(true);
  }, []);

  const flyout = flyoutOpen ? (
    <ComposeDiscoverFlyout
      historyKey={historyKey}
      mode={editRule ? 'edit' : 'create'}
      rule={editRule ?? undefined}
      ruleId={editRule?.id}
      onClose={closeFlyout}
      services={ruleFormServices}
      onCreateRule={(payload, ruleNotifications) =>
        createRuleMutation.mutate(payload, {
          onSuccess: async (rule) => {
            if (ruleNotifications) {
              setIsFinalizing(true);
              try {
                const workflowId = await resolveWorkflowId(
                  ruleNotifications.workflow,
                  workflowsApi
                );
                await actionPoliciesApi.createActionPolicy({
                  name: `${rule.metadata.name} notifications`,
                  description: `Notifications for rule "${rule.metadata.name}"`,
                  type: 'single_rule',
                  ruleId: rule.id,
                  destinations: [{ type: 'workflow', id: workflowId }],
                  groupingMode: 'per_episode',
                  throttle: { strategy: 'on_status_change', interval: null },
                });
              } catch (err) {
                notifications.toasts.addError(err, {
                  title: i18n.translate(
                    'xpack.alertingV2.useComposeDiscoverFlyout.notificationsSetupError',
                    { defaultMessage: 'Failed to set up notifications for the rule.' }
                  ),
                });
                return;
              } finally {
                setIsFinalizing(false);
              }
            }
            setFlyoutOpen(false);
            if (createSuccessRedirectPath) {
              application.navigateToUrl(http.basePath.prepend(createSuccessRedirectPath));
            }
          },
        })
      }
      onUpdateRule={(id, payload) =>
        updateRuleMutation.mutate(
          { id, payload },
          {
            onSuccess: closeFlyout,
          }
        )
      }
      isSaving={createRuleMutation.isLoading || updateRuleMutation.isLoading || isFinalizing}
    />
  ) : null;

  return {
    flyout,
    openCreateFlyout,
    openEditFlyout,
  };
};
