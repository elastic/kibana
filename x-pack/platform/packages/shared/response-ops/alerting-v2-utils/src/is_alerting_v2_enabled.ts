/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID,
} from '@kbn/alerting-v2-constants';

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
 * Returns whether Alerting v2 UI surfaces should be shown based on the
 * `alerting:v2:enabled` advanced setting.
 *
 * The full `CoreStart` is intentionally accepted (rather than a narrower
 * `Pick<CoreStart, 'settings'>`) so that future gating concerns
 * (capability-based RBAC via `core.application.capabilities`, license
 * checks, etc.) can be added inside this helper without changing its
 * signature or touching any of the consumer files again.
 */
export const isAlertingV2Enabled: (core: CoreStart) => boolean = (core) => {
  return core.settings.globalClient.get<boolean>(ALERTING_V2_ENABLED_SETTING_ID, false) === true;
};

/**
 * Returns whether Alerting v2 create-rule UI should be shown for the current user.
 *
 * Combines the advanced-setting gate ({@link isAlertingV2Enabled}) with RBAC via
 * registered Alerting v2 rules capabilities. Callers remain responsible for any
 * additional context (for example ES|QL mode in Discover).
 */
export const shouldShowAlertingV2CreateRuleFlyout = (core: CoreStart): boolean => {
  return isAlertingV2Enabled(core) && hasAlertingV2Capability(core, 'rules', 'all');
};

/**
 * Returns whether the classic Observability alerts table should appear in
 * solution navigation.
 *
 * Always shown while Alerting v2 is disabled. When v2 is enabled, shown only
 * if the space-scoped `alerting:v2:showClassicAlertsTable` setting is true.
 */
export const shouldShowClassicObservabilityAlertsTable = (core: CoreStart): boolean => {
  if (!isAlertingV2Enabled(core)) {
    return true;
  }

  return (
    core.settings.client.get<boolean>(ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID, false) ===
    true
  );
};

/**
 * Returns whether the current user can reach Alerting v2 rules at all: the advanced-setting
 * gate ({@link isAlertingV2Enabled}) plus rules read access ({@link hasAlertingV2Capability}).
 */
export const canAccessAlertingV2Rules = (core: CoreStart): boolean => {
  return isAlertingV2Enabled(core) && hasAlertingV2Capability(core, 'rules');
};
