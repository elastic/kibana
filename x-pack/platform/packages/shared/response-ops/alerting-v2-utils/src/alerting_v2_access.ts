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
 * Returns whether Alerting v2 create-rule UI should be shown for the current user. Absence of the
 * plugin already yields `false` here, so no separate availability check is needed.
 */
export const shouldShowAlertingV2CreateRuleFlyout = (core: CoreStart): boolean =>
  getAlertingV2RulesCapabilities(core)?.all === true;
