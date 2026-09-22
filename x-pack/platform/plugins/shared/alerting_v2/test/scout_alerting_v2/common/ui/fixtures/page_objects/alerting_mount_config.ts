/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingApp } from './alerting_navigation';

export interface AlertingMountConfig {
  readonly appRoute: string;
  readonly paths: Record<AlertingApp, string>;
  readonly subPaths: {
    readonly rulesCreate: string;
    readonly rulesDetail: (ruleId: string) => string;
    readonly episodeDetail: (episodeId: string) => string;
    readonly actionPoliciesCreate: string;
    readonly actionPoliciesEdit: (policyId: string) => string;
  };
}

export const OBSERVABILITY_MOUNT_CONFIG: AlertingMountConfig = {
  appRoute: 'observability/alerting',
  paths: {
    rules: '/rules/v2',
    ruleLibrary: '/rule-library',
    alerts: '/inbox',
    actionPolicies: '/action-policies',
    executionHistory: '/execution-history',
  },
  subPaths: {
    rulesCreate: '/rules/v2/create',
    rulesDetail: (ruleId: string) => `/rules/v2/${ruleId}`,
    episodeDetail: (episodeId: string) => `/inbox/${encodeURIComponent(episodeId)}`,
    actionPoliciesCreate: '/action-policies/create',
    actionPoliciesEdit: (policyId: string) => `/action-policies/edit/${policyId}`,
  },
};
