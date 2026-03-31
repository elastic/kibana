/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_V2_BASE_PATH = '/app/management/insightsAndAlerting/alerting_v2';
export const ALERTING_V2_APP_ID = 'alerting_v2';
export const ALERTING_V2_APP_ROUTE = '/alerting_v2';
export const ALERTING_V2_MANAGEMENT_PATH = 'insightsAndAlerting/alerting_v2';
export const MANAGEMENT_APP_ID = 'management';
export const ALERTING_V2_NOTIFICATION_POLICIES_PATH = `${ALERTING_V2_BASE_PATH}/notification_policies`;
export { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
export const INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH =
  '/internal/alerting/v2/notification_policies' as const;

export const paths = {
  ruleCreate: `${ALERTING_V2_BASE_PATH}/create`,
  ruleEdit: (id: string) => `${ALERTING_V2_BASE_PATH}/edit/${encodeURIComponent(id)}`,
  ruleDetails: (id: string) => `${ALERTING_V2_BASE_PATH}/${encodeURIComponent(id)}`,
  ruleList: ALERTING_V2_BASE_PATH,
  notificationPolicyCreate: `${ALERTING_V2_NOTIFICATION_POLICIES_PATH}/create`,
  notificationPolicyEdit: (id: string) =>
    `${ALERTING_V2_NOTIFICATION_POLICIES_PATH}/edit/${encodeURIComponent(id)}`,
  notificationPolicyList: ALERTING_V2_NOTIFICATION_POLICIES_PATH,
};
