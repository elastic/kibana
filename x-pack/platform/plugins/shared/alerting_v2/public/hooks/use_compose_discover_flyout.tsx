/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ComposeDiscoverFlyout } from '@kbn/alerting-v2-rule-form';
import type { RuleFormServices, WorkflowFormComponentProps } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../services/rules_api';
import { useCreateRule } from './use_create_rule';
import { useUpdateRule } from './use_update_rule';
import {
  SingleStepWorkflowForm,
  type ExistingWorkflowFormValue,
  type SingleStepWorkflowFormValue,
} from '../components/single_step_workflow_form';
import { WorkflowsApi } from '../services/workflows_api';
import { ActionPoliciesApi } from '../services/action_policies_api';

interface UseComposeDiscoverFlyoutOptions {
  createSuccessRedirectPath?: string;
}

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
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo<RuleFormServices>(
    () => ({
      http,
      data,
      dataViews,
      notifications,
      application,
      lens,
      workflowForm: {
        Component: SingleStepWorkflowForm as React.ComponentType<WorkflowFormComponentProps>,
        defaultValue: (): ExistingWorkflowFormValue => ({ mode: 'existing', workflowId: null }),
      },
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
            if (ruleNotifications?.enabled) {
              const workflowValue = ruleNotifications.workflow as SingleStepWorkflowFormValue;
              let workflowId: string;
              if (workflowValue.mode === 'create') {
                const created = await workflowsApi.createWorkflow(workflowValue);
                workflowId = created.id;
              } else {
                workflowId = workflowValue.workflowId!;
              }
              await actionPoliciesApi.createActionPolicy({
                name: `${rule.metadata.name} notifications`,
                description: `Notifications for rule "${rule.metadata.name}"`,
                type: 'single_rule',
                ruleId: rule.id,
                destinations: [{ type: 'workflow', id: workflowId }],
                groupingMode: 'per_episode',
                throttle: { strategy: 'on_status_change', interval: null },
              });
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
      isSaving={createRuleMutation.isLoading || updateRuleMutation.isLoading}
    />
  ) : null;

  return {
    flyout,
    openCreateFlyout,
    openEditFlyout,
  };
};
