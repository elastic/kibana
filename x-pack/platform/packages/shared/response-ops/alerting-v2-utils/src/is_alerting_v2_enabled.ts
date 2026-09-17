/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';

/** Feature id from `@kbn/alerting-v2-plugin/common/feature_privileges`. */
const ALERTING_V2_RULES_FEATURE_ID = 'alerting_v2_rules';

const getAlertingV2RulesCapabilities = (core: CoreStart): Record<string, boolean> | undefined =>
  core.application.capabilities[ALERTING_V2_RULES_FEATURE_ID] as
    | Record<string, boolean>
    | undefined;

const getAlertingV2RulesCapabilityFlags = (core: CoreStart): { read: boolean; write: boolean } => {
  const rulesCapabilities = getAlertingV2RulesCapabilities(core);
  const write = rulesCapabilities?.all === true;
  const read = write || rulesCapabilities?.read === true;
  return { read, write };
};

/**
 * Returns whether the current user has read (or write, since `all` implies `read`) access to
 * Alerting v2 rules.
 */
export const hasAlertingV2RulesReadCapability = (core: CoreStart): boolean =>
  getAlertingV2RulesCapabilityFlags(core).read;

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
export const isAlertingV2Enabled = (core: CoreStart): boolean => {
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
  return isAlertingV2Enabled(core) && getAlertingV2RulesCapabilityFlags(core).write;
};

/**
 * Returns whether the current user can reach Alerting v2 rules at all: the advanced-setting
 * gate ({@link isAlertingV2Enabled}) plus read access ({@link hasAlertingV2RulesReadCapability}).
 */
export const canAccessAlertingV2Rules = (core: CoreStart): boolean => {
  return isAlertingV2Enabled(core) && hasAlertingV2RulesReadCapability(core);
};
