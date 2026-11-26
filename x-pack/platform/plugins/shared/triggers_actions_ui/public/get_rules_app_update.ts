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
import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, map, of } from 'rxjs';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import { hasAlertingV2Capability, isAlertingV2AvailableInSolution } from '@kbn/alerting-v2-utils';
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
 * When Observability Alerting offers this user the Rules page in global search, the Stack
 * Management Rules page leaves search but stays linkable from solution side navs.
 */
export const getRulesManagementVisibleIn = (
  coreStart: CoreStart,
  { alertingV2Enabled, solutionNavId }: { alertingV2Enabled: boolean; solutionNavId: string | null }
): AppDeepLinkLocations[] =>
  alertingV2Enabled &&
  hasAlertingV2Capability(coreStart, 'rules') &&
  isAlertingV2AvailableInSolution(solutionNavId)
    ? RULES_APP_VISIBLE_IN
    : RULES_MANAGEMENT_SEARCHABLE_VISIBLE_IN;

/** Re-evaluates {@link getRulesManagementVisibleIn} when the alerting v2 setting or the active solution changes. */
export const getRulesManagementVisibleIn$ = (
  coreStart: CoreStart
): Observable<AppDeepLinkLocations[]> => {
  const { globalClient } = coreStart.settings;
  // `get$` throws for an undeclared key, and the setting is only declared where alerting v2 runs.
  const alertingV2Enabled$ = globalClient.isDeclared(ALERTING_V2_ENABLED_SETTING_ID)
    ? globalClient.get$<boolean>(ALERTING_V2_ENABLED_SETTING_ID)
    : of(false);

  return combineLatest([alertingV2Enabled$, coreStart.chrome.getActiveSolutionNavId$()]).pipe(
    map(([alertingV2Enabled, solutionNavId]) =>
      getRulesManagementVisibleIn(coreStart, { alertingV2Enabled, solutionNavId })
    ),
    distinctUntilChanged(isEqual)
  );
};
