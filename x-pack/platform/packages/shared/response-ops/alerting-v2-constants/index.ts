/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './src';

export const ALERTING_V2_RULE_API_PATH = '/api/alerting/v2/rules' as const;
export const ALERTING_V2_ALERT_API_PATH = '/api/alerting/v2/alerts' as const;
export const ALERTING_V2_NOTIFICATION_POLICY_API_PATH =
  '/api/alerting/v2/notification_policies' as const;
export const ALERTING_V2_MATCHER_VALUE_SUGGESTIONS_API_PATH =
  '/api/alerting/v2/notification_policies/suggestions/values' as const;
export const ALERTING_V2_INTERNAL_SUGGEST_USER_PROFILES_API_PATH =
  '/api/alerting/v2/internal/user_profiles/_suggest' as const;
