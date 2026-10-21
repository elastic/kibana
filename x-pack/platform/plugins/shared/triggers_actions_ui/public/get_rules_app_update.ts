/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppDeepLinkLocations,
  AppUpdatableFields,
  Capabilities,
  CoreStart,
} from '@kbn/core/public';
import { AppStatus } from '@kbn/core/public';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import { canAccessTriggersActionsRules } from '@kbn/rule-data-utils';

const RULES_APP_VISIBLE_IN: AppDeepLinkLocations[] = ['projectSideNav'];
const RULES_MANAGEMENT_SEARCHABLE_VISIBLE_IN: AppDeepLinkLocations[] = [
  'globalSearch',
  'projectSideNav',
];

/**
 * The standalone `rules` app's nav link capability isn't owned by any feature, so it stays enabled
 * for everyone. Gate it on the Rules management capability instead, so users without rules access
 * (e.g. `stackAlertsOnly`) can't reach it via the solution side nav or direct navigation.
 */
export const getRulesAppUpdate = (
  capabilities: Capabilities
): Pick<AppUpdatableFields, 'status' | 'visibleIn'> => {
  return canAccessTriggersActionsRules(capabilities)
    ? { status: AppStatus.accessible, visibleIn: RULES_APP_VISIBLE_IN }
    : { status: AppStatus.inaccessible, visibleIn: [] };
};

/**
 * With Alerting v2 enabled, Classic rules open inside Observability Alerting, so the Stack
 * Management Rules page leaves global search but stays linkable from solution side navs.
 */
export const getRulesManagementVisibleIn = (coreStart: CoreStart): AppDeepLinkLocations[] =>
  isAlertingV2Enabled(coreStart) ? RULES_APP_VISIBLE_IN : RULES_MANAGEMENT_SEARCHABLE_VISIBLE_IN;
