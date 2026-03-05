/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_V2_BASE_PATH = '/app/management/insightsAndAlerting/alerting_v2';
export const ALERTING_V2_APP_ID = 'alerting_v2';
export const ALERTING_V2_APP_ROUTE = '/alerting_v2';
export const ALERTING_V2_NOTIFICATION_POLICIES_PATH = `${ALERTING_V2_BASE_PATH}/notification_policies`;
export const INTERNAL_ALERTING_V2_RULE_API_PATH = '/internal/alerting/v2/rule' as const;
export const INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH =
  '/internal/alerting/v2/notification_policies' as const;

export const paths = {
  notificationPolicyCreate: `${ALERTING_V2_NOTIFICATION_POLICIES_PATH}/create`,
  notificationPolicyEdit: (id: string) =>
    `${ALERTING_V2_NOTIFICATION_POLICIES_PATH}/edit/${encodeURIComponent(id)}`,
  notificationPolicyList: ALERTING_V2_NOTIFICATION_POLICIES_PATH,
};
