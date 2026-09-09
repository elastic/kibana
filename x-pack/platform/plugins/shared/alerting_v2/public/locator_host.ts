/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import {
  ALERTING_V2_ACTION_POLICIES_APP_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_EXECUTION_HISTORY_APP_ID,
  ALERTING_V2_RULE_LIBRARY_APP_ID,
  ALERTING_V2_RULES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';

export interface AlertingV2LocatorHost extends SerializableRecord {
  app: string;
  basePath: string;
}

export interface AlertingV2HostApp {
  rules: AlertingV2LocatorHost;
  ruleLibrary: AlertingV2LocatorHost;
  episodes: AlertingV2LocatorHost;
  actionPolicies: AlertingV2LocatorHost;
  executionHistory: AlertingV2LocatorHost;
}

const MANAGEMENT_APP_ID = 'management';

export const MANAGEMENT_HOST: AlertingV2HostApp = {
  rules: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`,
  },
  ruleLibrary: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULE_LIBRARY_APP_ID}`,
  },
  episodes: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`,
  },
  actionPolicies: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`,
  },
  executionHistory: {
    app: MANAGEMENT_APP_ID,
    basePath: `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EXECUTION_HISTORY_APP_ID}`,
  },
};

export const pageHost = (
  params: { host?: AlertingV2LocatorHost },
  fallback: AlertingV2LocatorHost
): AlertingV2LocatorHost => params.host ?? fallback;

export const createAlertingV2HostApp = (
  appId: string,
  pageBasePaths: {
    rules: string;
    ruleLibrary: string;
    episodes: string;
    actionPolicies: string;
    executionHistory: string;
  }
): AlertingV2HostApp => ({
  rules: { app: appId, basePath: pageBasePaths.rules },
  ruleLibrary: { app: appId, basePath: pageBasePaths.ruleLibrary },
  episodes: { app: appId, basePath: pageBasePaths.episodes },
  actionPolicies: { app: appId, basePath: pageBasePaths.actionPolicies },
  executionHistory: { app: appId, basePath: pageBasePaths.executionHistory },
});

export type CreateAlertingV2HostApp = typeof createAlertingV2HostApp;
