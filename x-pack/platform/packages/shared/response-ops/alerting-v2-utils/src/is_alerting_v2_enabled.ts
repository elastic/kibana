/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID,
} from '@kbn/alerting-v2-constants';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';

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

const isAlertingV2EnabledSetting = ({ globalClient }: CoreStart['settings']): boolean =>
  globalClient.isDeclared(ALERTING_V2_ENABLED_SETTING_ID) &&
  globalClient.get<boolean>(ALERTING_V2_ENABLED_SETTING_ID) === true;

/**
 * Returns whether Alerting v2 UI surfaces should be shown based on the
 * `alerting:v2:enabled` advanced setting.
 *
 * The full `CoreStart` is intentionally accepted (rather than a narrower
 * `Pick<CoreStart, 'settings'>`) so that future gating concerns
 * (capability-based RBAC via `core.application.capabilities`, license
 * checks, etc.) can be added inside this helper without changing its
 * signature or touching any of the consumer files again.
 *
 * The setting is read without a default override so the registered default applies. It is only
 * registered where the Alerting v2 plugin runs, so an undeclared setting resolves to `false`.
 */
export const isAlertingV2Enabled: (core: CoreStart) => boolean = (core) =>
  isAlertingV2EnabledSetting(core.settings);

const OBSERVABILITY_SOLUTION_NAV_ID = 'oblt';

/** Returns whether the active solution nav id is Observability or none (a classic space); other solution views return `false`. */
export const isAlertingV2AvailableInSolution = (
  solutionNavId: string | null | undefined
): boolean => {
  return !solutionNavId || solutionNavId === OBSERVABILITY_SOLUTION_NAV_ID;
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
 * Returns whether the V1 Observability alerts table should appear in
 * solution navigation.
 *
 * Always shown while Alerting v2 is disabled. When v2 is enabled, shown only
 * if the space-scoped `alerting:v1:showV1ObservabilityAlertsTable` setting is true.
 */
export const shouldShowV1ObservabilityAlertsTable = (core: CoreStart): boolean => {
  if (!isAlertingV2Enabled(core)) {
    return true;
  }

  return (
    core.settings.client.get<boolean>(
      ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID,
      false
    ) === true
  );
};

/**
 * Returns whether the current user can reach Alerting v2 rules at all: the advanced-setting
 * gate ({@link isAlertingV2Enabled}) plus rules read access ({@link hasAlertingV2Capability}).
 */
export const canAccessAlertingV2Rules = (core: CoreStart): boolean => {
  return isAlertingV2Enabled(core) && hasAlertingV2Capability(core, 'rules');
};

/**
 * Returns whether the settings turn on the Import alerts page: `alerting:v2:enabled` plus the
 * space-scoped Agent Builder experimental features setting. Privileges are checked separately.
 */
export const areAlertingV2ImportsEnabled = (settings: CoreStart['settings']): boolean =>
  isAlertingV2EnabledSetting(settings) &&
  // Agent Builder registers this setting; the default covers deployments without it.
  settings.client.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, false) === true;

/**
 * Returns whether the Import alerts page should be shown: the settings that turn it on
 * ({@link areAlertingV2ImportsEnabled}) plus Alerting v2 rules access.
 */
export const isAlertingV2ImportsAvailable = (core: CoreStart): boolean =>
  areAlertingV2ImportsEnabled(core.settings) && hasAlertingV2Capability(core, 'rules');
