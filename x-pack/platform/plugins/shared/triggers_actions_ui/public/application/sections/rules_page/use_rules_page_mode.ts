/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import { shouldShowAlertingV2RulesTab } from '@kbn/response-ops-rules-page-tabs';
import { useKibana } from '../../../common/lib/kibana';

/**
 * The three mutually exclusive presentations the Rules app can take, derived
 * from the Alerting v2 advanced setting and the user's v2 rules capability.
 */
export const RULES_PAGE_MODE = {
  /** v2 disabled: classic Rules/Logs tabs. */
  v1Classic: 'v1Classic',
  /** v2 enabled and the user can read v2 rules: show the v2 Rules tab. */
  v1WithV2Tabs: 'v1WithV2Tabs',
  /** v2 enabled but the user lacks the v2 rules capability: suppress tabs. */
  v2: 'v2',
} as const;

export type RulesPageMode = (typeof RULES_PAGE_MODE)[keyof typeof RULES_PAGE_MODE];

/**
 * Order is load-bearing: `shouldShowAlertingV2RulesTab` is a strict subset of
 * `isAlertingV2Enabled` (setting AND capability), so it must be checked first —
 * otherwise the capability-gated case would be masked by the setting-only case.
 */
export const useRulesPageMode = (): RulesPageMode => {
  const services = useKibana().services;

  if (shouldShowAlertingV2RulesTab(services)) {
    return RULES_PAGE_MODE.v1WithV2Tabs;
  }

  if (isAlertingV2Enabled(services)) {
    return RULES_PAGE_MODE.v2;
  }

  return RULES_PAGE_MODE.v1Classic;
};
