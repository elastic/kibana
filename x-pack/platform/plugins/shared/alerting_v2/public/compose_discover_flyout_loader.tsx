/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { ComposeDiscoverFlyoutProps } from '@kbn/alerting-v2-rule-form';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { untilPluginStartServicesReady, type AlertingV2KibanaServices } from './kibana_services';
import { RulesApi } from './services/rules_api';
import { useCreateActionPolicyDisabledReason } from './hooks/use_create_action_policy_disabled_reason';
import { getAlertingV2Locators } from './application/bind_locators_to_host';
import { OBSERVABILITY_ALERTING_HOST } from '../common/locators';

export interface LoadedComposeDiscoverModules {
  services: AlertingV2KibanaServices;
  ComposeDiscoverFlyout: React.ComponentType<ComposeDiscoverFlyoutProps>;
}

/** Loads the rule form bundle and plugin services needed to mount `ComposeDiscoverFlyout`. */
export const loadComposeDiscoverModules = async (): Promise<LoadedComposeDiscoverModules> => {
  const [services, ruleFormModule, actionPolicyFormModule] = await Promise.all([
    untilPluginStartServicesReady(),
    import('@kbn/alerting-v2-rule-form'),
    import('./components/action_policy/form_flyout/create_action_policy_form_flyout'),
  ]);
  return {
    services: {
      ...services,
      createActionPolicyFormFlyout: actionPolicyFormModule.CreateActionPolicyFormFlyout,
    },
    ComposeDiscoverFlyout: ruleFormModule.ComposeDiscoverFlyout,
  };
};

export const ActionPolicyAwareComposeDiscoverFlyout = ({
  services,
  ComposeDiscoverFlyout,
  ...props
}: Omit<ComposeDiscoverFlyoutProps, 'services'> & LoadedComposeDiscoverModules) => {
  const createActionPolicyDisabledReason = useCreateActionPolicyDisabledReason();
  const share = useService(PluginStart('share')) as SharePluginStart;

  const getActionPolicyEditHref = useCallback(
    (actionPolicyId: string) =>
      getAlertingV2Locators(share).actionPolicyLocators.getRedirectUrl({
        page: 'edit',
        actionPolicyId,
        host: OBSERVABILITY_ALERTING_HOST.actionPolicies,
      }),
    [share]
  );
  const actionPolicyAwareServices = useMemo(
    () => ({ ...services, createActionPolicyDisabledReason, getActionPolicyEditHref }),
    [services, createActionPolicyDisabledReason, getActionPolicyEditHref]
  );

  return <ComposeDiscoverFlyout {...props} services={actionPolicyAwareServices} />;
};

/** Creates a rule through the v2 API, toasting the outcome; `isSaving` stays true after success. */
export const useCreateRuleSubmit = (
  services: AlertingV2KibanaServices | undefined,
  onCreated: (rule: RuleResponse) => void
): { isSaving: boolean; createRule: (payload: CreateRuleData) => Promise<void> } => {
  const [isSaving, setIsSaving] = useState(false);
  const rulesApi = useMemo(
    () => (services ? new RulesApi(services.http) : undefined),
    [services]
  );

  const createRule = useCallback(
    async (payload: CreateRuleData) => {
      if (!rulesApi || !services) return;
      setIsSaving(true);
      try {
        const rule = await rulesApi.createRule(payload);
        services.notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.createAlertFlyout.createSuccess', {
            defaultMessage: 'Rule "{ruleName}" created successfully',
            values: { ruleName: rule.metadata.name },
          })
        );
        onCreated(rule);
      } catch (err) {
        services.notifications.toasts.addDanger(
          i18n.translate('xpack.alertingV2.createAlertFlyout.createError', {
            defaultMessage: 'Failed to create rule',
          })
        );
        setIsSaving(false);
      }
    },
    [rulesApi, services, onCreated]
  );

  return { isSaving, createRule };
};
