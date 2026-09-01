/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kibana feature IDs for Alerting v2. Used as capability keys
 * (`application.capabilities[id]`) and as role `feature` keys.
 */
export const ALERTING_V2_FEATURE_IDS = {
  rules: 'alerting_rules',
  alerts: 'alerting_alerts',
  actionPolicies: 'alerting_action_policies',
  executionHistory: 'alerting_execution_history',
} as const;

/**
 * Feature IDs granted in 9.5.0/9.5.1 before the `v2` qualifier was dropped.
 * Keep these registered as deprecated so existing roles and space settings
 * continue to grant/hide the renamed features.
 */
export const ALERTING_V2_DEPRECATED_FEATURE_IDS = {
  rules: 'alerting_v2_rules',
  alerts: 'alerting_v2_alerts',
  actionPolicies: 'alerting_v2_action_policies',
  executionHistory: 'alerting_v2_execution_history',
} as const;
