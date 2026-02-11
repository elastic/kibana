/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import {
  DASHBOARD_AGENT_FEATURE_FLAG,
  DASHBOARD_AGENT_FEATURE_FLAG_DEFAULT,
} from '../../common/constants';
import type { DashboardAgentPluginStart, DashboardAgentStartDependencies } from '../types';

export async function getIsDashboardAgentEnabled(
  core: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>
) {
  const [coreStart] = await core.getStartServices();
  const isFeatureFlagEnabled = await coreStart.featureFlags.getBooleanValue(
    DASHBOARD_AGENT_FEATURE_FLAG,
    DASHBOARD_AGENT_FEATURE_FLAG_DEFAULT
  );

  return isFeatureFlagEnabled;
}
