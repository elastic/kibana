/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { ALERTING_V2_SHOW_STANDARD_ALERTS_PAGE_SETTING_ID } from '@kbn/alerting-v2-constants';

/**
 * Feature ids from `@kbn/alerting-v2-plugin/common/feature_privileges`.
 * Duplicated here so this package does not depend on the plugin.
 */
const ALERTING_V2_FEATURE_IDS = {
  alerts: 'alerting_v2_alerts',
  rules: 'alerting_v2_rules',
  actionPolicies: 'alerting_v2_action_policies',
  executionHistory: 'alerting_v2_execution_history',
} as const;

export type AlertingV2CapabilityFeature = keyof typeof ALERTING_V2_FEATURE_IDS;
export type AlertingV2CapabilityLevel = 'read' | 'all';

/**
 * Returns whether the user holds the requested Alerting v2 UI capability.
 * `read` is granted by either the top-level `all` or `read` flag. `all` requires write.
 */
export const hasAlertingV2Capability = (
  core: CoreStart,
  feature: AlertingV2CapabilityFeature,
  capability: AlertingV2CapabilityLevel = 'read'
): boolean => {
  const featureCapabilities = core.application.capabilities[ALERTING_V2_FEATURE_IDS[feature]] as
    | Record<string, boolean>
    | undefined;

  if (capability === 'all') {
    return featureCapabilities?.all === true;
  }

  return featureCapabilities?.all === true || featureCapabilities?.read === true;
};

/**
 * Returns whether the current user has read (or write, since `all` implies `read`) access to
 * Alerting v2 rules.
 */
export const hasAlertingV2RulesReadCapability = (core: CoreStart): boolean =>
  hasAlertingV2Capability(core, 'rules');

/**
 * Returns whether Alerting v2 create-rule UI should be shown for the current user. Absence of the
 * plugin already yields `false` here, so no separate availability check is needed.
 */
export const shouldShowAlertingV2CreateRuleFlyout = (core: CoreStart): boolean =>
  hasAlertingV2Capability(core, 'rules', 'all');

/**
 * Returns whether the standard Observability alerts page should appear in
 * solution navigation. Shown only when the space-scoped
 * `alerting:v1:showStandardObservabilityAlertsPage` setting is true.
 */
export const shouldShowStandardObservabilityAlertsPage = (core: CoreStart): boolean =>
  core.settings.client.get<boolean>(ALERTING_V2_SHOW_STANDARD_ALERTS_PAGE_SETTING_ID, false) ===
  true;

/** Returns whether the current user can reach Alerting v2 rules. */
export const canAccessAlertingV2Rules = (core: CoreStart): boolean =>
  hasAlertingV2Capability(core, 'rules');
