/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';

/** Feature id from `@kbn/alerting-v2-plugin/common/feature_privileges`. */
const ALERTING_V2_RULES_FEATURE_ID = 'alerting_v2_rules';

const getAlertingV2RulesCapabilities = (core: CoreStart): Record<string, boolean> | undefined =>
  core.application.capabilities[ALERTING_V2_RULES_FEATURE_ID] as
    | Record<string, boolean>
    | undefined;

/**
 * Returns whether the current user has read (or write, since `all` implies `read`) access to
 * Alerting v2 rules.
 */
export const hasAlertingV2RulesReadCapability = (core: CoreStart): boolean => {
  const rulesCapabilities = getAlertingV2RulesCapabilities(core);
  return rulesCapabilities?.all === true || rulesCapabilities?.read === true;
};

/**
 * Returns whether the `alertingVTwo` plugin loaded and registered its Kibana feature in this
 * deployment — not an RBAC check. A registered feature's capability namespace is always present,
 * even for a user with no privileges on it, so presence signals "the plugin is running here".
 * Notably `false` for Security Search AI Lake, which disables the `maintenanceWindows` dependency
 * Alerting v2 requires, and for any deployment with `xpack.alerting_v2.enabled: false`.
 *
 * A space that explicitly disables the Alerting v2 feature also keeps the namespace present (with
 * every flag `false`), so this can be `true` there too — pair it with
 * {@link hasAlertingV2RulesReadCapability} rather than relying on it alone for per-space gating.
 */
export const isAlertingV2Available = (core: CoreStart): boolean =>
  getAlertingV2RulesCapabilities(core) !== undefined;

/**
 * Returns whether Alerting v2 create-rule UI should be shown for the current user. Absence of the
 * plugin already yields `false` here, so no separate availability check is needed.
 */
export const shouldShowAlertingV2CreateRuleFlyout = (core: CoreStart): boolean =>
  getAlertingV2RulesCapabilities(core)?.all === true;
