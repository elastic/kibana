/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorHost } from '@kbn/rule-data-utils';

export interface AlertingV2HostApp {
  rules: LocatorHost;
  ruleLibrary: LocatorHost;
  episodes: LocatorHost;
  actionPolicies: LocatorHost;
  executionHistory: LocatorHost;
}

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
