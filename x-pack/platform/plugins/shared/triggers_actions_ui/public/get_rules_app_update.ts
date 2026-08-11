/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkLocations, AppUpdatableFields, Capabilities } from '@kbn/core/public';
import { AppStatus } from '@kbn/core/public';
import { RULES_CAPABILITY_ID } from './common/constants';

const RULES_APP_VISIBLE_IN: AppDeepLinkLocations[] = ['projectSideNav'];

/**
 * The standalone `rules` app's nav link capability isn't owned by any feature, so it stays enabled
 * for everyone. Gate it on the Rules management capability instead, so users without rules access
 * (e.g. `stackAlertsOnly`) can't reach it via the solution side nav or direct navigation.
 */
export const getRulesAppUpdate = (
  capabilities: Capabilities
): Pick<AppUpdatableFields, 'status' | 'visibleIn'> => {
  const hasRulesAccess = Boolean(
    capabilities.management?.insightsAndAlerting?.[RULES_CAPABILITY_ID]
  );
  return hasRulesAccess
    ? { status: AppStatus.accessible, visibleIn: RULES_APP_VISIBLE_IN }
    : { status: AppStatus.inaccessible, visibleIn: [] };
};
