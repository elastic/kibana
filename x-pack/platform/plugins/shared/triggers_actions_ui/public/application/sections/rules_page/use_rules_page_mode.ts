/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasAlertingV2RulesReadCapability, isAlertingV2Available } from '@kbn/alerting-v2-utils';
import { useKibana } from '../../../common/lib/kibana';

/**
 * The three mutually exclusive presentations the Rules app can take, derived
 * from whether the `alertingVTwo` plugin loaded in this deployment and the
 * user's v2 rules capability.
 */
export const RULES_PAGE_MODE = {
  /** Alerting v2 not deployed here: classic Rules/Logs tabs. */
  triggersActionsTabs: 'triggersActionsTabs',
  /** Alerting v2 deployed and the user can read v2 rules: show the v2 Rules tab. */
  v1AndV2Tabs: 'v1AndV2Tabs',
  /** Alerting v2 deployed but the user lacks the v2 rules capability: suppress tabs. */
  noTabs: 'noTabs',
} as const;

export type RulesPageMode = (typeof RULES_PAGE_MODE)[keyof typeof RULES_PAGE_MODE];

/**
 * Order is load-bearing: `hasAlertingV2RulesReadCapability` is a strict subset of
 * `isAlertingV2Available` (deployment AND capability), so it must be checked first —
 * otherwise the capability-gated case would be masked by the deployment-only case.
 */
export const useRulesPageMode = (): RulesPageMode => {
  const services = useKibana().services;

  if (hasAlertingV2RulesReadCapability(services)) {
    return RULES_PAGE_MODE.v1AndV2Tabs;
  }

  if (isAlertingV2Available(services)) {
    return RULES_PAGE_MODE.noTabs;
  }

  return RULES_PAGE_MODE.triggersActionsTabs;
};
