/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasAlertingV2RulesReadCapability } from '@kbn/alerting-v2-utils';
import { useKibana } from '../../../common/lib/kibana';

/** The two Rules-page presentations, derived from the user's V2 rules capability. */
export const RULES_PAGE_MODE = {
  /** The user can read V2 rules: show the V2 Rules tab. */
  v1AndV2Tabs: 'v1AndV2Tabs',
  /** The user cannot read V2 rules: suppress tabs. */
  noTabs: 'noTabs',
} as const;

export type RulesPageMode = (typeof RULES_PAGE_MODE)[keyof typeof RULES_PAGE_MODE];

export const useRulesPageMode = (): RulesPageMode => {
  const services = useKibana().services;

  return hasAlertingV2RulesReadCapability(services)
    ? RULES_PAGE_MODE.v1AndV2Tabs
    : RULES_PAGE_MODE.noTabs;
};
