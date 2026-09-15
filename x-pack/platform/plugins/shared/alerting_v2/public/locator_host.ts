/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorHost } from '@kbn/rule-data-utils';
import {
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_EXECUTION_HISTORY_APP_ID,
  ALERTING_V2_RULE_LIBRARY_APP_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';

export interface AlertingV2HostApp {
  rules: LocatorHost;
  ruleLibrary: LocatorHost;
  episodes: LocatorHost;
  actionPolicies: LocatorHost;
  executionHistory: LocatorHost;
}

const MANAGEMENT_APP_ID = 'management';

export const MANAGEMENT_HOST: AlertingV2HostApp = {
  rules: {
    app: MANAGEMENT_APP_ID,
    pathPrefix: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`,
  },
  ruleLibrary: {
    app: MANAGEMENT_APP_ID,
    pathPrefix: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULE_LIBRARY_APP_ID}`,
  },
  episodes: {
    app: MANAGEMENT_APP_ID,
    pathPrefix: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`,
  },
  actionPolicies: {
    app: MANAGEMENT_APP_ID,
    pathPrefix: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`,
  },
  executionHistory: {
    app: MANAGEMENT_APP_ID,
    pathPrefix: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EXECUTION_HISTORY_APP_ID}`,
  },
};

export const pageHost = (params: { host?: LocatorHost }, fallback: LocatorHost): LocatorHost =>
  params.host ?? fallback;

export const createAlertingV2HostApp = (
  appId: string,
  pagePathPrefixes: {
    rules: string;
    ruleLibrary: string;
    episodes: string;
    actionPolicies: string;
    executionHistory: string;
  }
): AlertingV2HostApp => ({
  rules: { app: appId, pathPrefix: pagePathPrefixes.rules },
  ruleLibrary: { app: appId, pathPrefix: pagePathPrefixes.ruleLibrary },
  episodes: { app: appId, pathPrefix: pagePathPrefixes.episodes },
  actionPolicies: { app: appId, pathPrefix: pagePathPrefixes.actionPolicies },
  executionHistory: { app: appId, pathPrefix: pagePathPrefixes.executionHistory },
});

export type CreateAlertingV2HostApp = typeof createAlertingV2HostApp;
