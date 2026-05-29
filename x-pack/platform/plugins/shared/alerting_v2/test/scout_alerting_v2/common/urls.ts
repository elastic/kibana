/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_API_PATH, ACTION_POLICY_API_PATH, RULE_API_PATH } from './constants';

/**
 * URL for a single rule resource: `${RULE_API_PATH}/${encodedId}`.
 *
 * Always pass through `encodeURIComponent` so callers cannot accidentally
 * leak unencoded characters into path segments — important for the validation
 * tests that craft pathological ids.
 */
export const getRuleUrl = (id: string) => `${RULE_API_PATH}/${encodeURIComponent(id)}`;

/**
 * URL for a single action policy resource:
 * `${ACTION_POLICY_API_PATH}/${encodedId}`.
 *
 * Always passes through `encodeURIComponent` so callers cannot accidentally
 * leak unencoded characters into path segments — important for the validation
 * tests that craft pathological ids.
 */
export const getActionPolicyUrl = (id: string) =>
  `${ACTION_POLICY_API_PATH}/${encodeURIComponent(id)}`;

export const getEnableActionPolicyUrl = (id: string) => `${getActionPolicyUrl(id)}/_enable`;

export const getDisableActionPolicyUrl = (id: string) => `${getActionPolicyUrl(id)}/_disable`;

export const getSnoozeActionPolicyUrl = (id: string) => `${getActionPolicyUrl(id)}/_snooze`;

export const getUnsnoozeActionPolicyUrl = (id: string) => `${getActionPolicyUrl(id)}/_unsnooze`;

export const getUpdateActionPolicyApiKeyUrl = (id: string) =>
  `${getActionPolicyUrl(id)}/_update_api_key`;

export const getBulkActionPoliciesUrl = () => `${ACTION_POLICY_API_PATH}/_bulk`;

export const getBulkRulesUrl = () => `${RULE_API_PATH}/_bulk_get`;

/**
 * URL for the list action policies endpoint, optionally with a query string.
 * Arrays are encoded as repeated `key=value` pairs (e.g. `?tags=a&tags=b`) to
 * match the route's query parser.
 */
export const getListActionPoliciesUrl = (
  query?: Record<string, string | number | string[]>
): string => {
  if (!query) return ACTION_POLICY_API_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.set(key, String(value));
    }
  }
  return `${ACTION_POLICY_API_PATH}?${params.toString()}`;
};
const getAlertActionUrl = (groupHash: string, suffix: string) =>
  `${ALERT_API_PATH}/${encodeURIComponent(groupHash)}/${suffix}`;

export const getAckAlertActionUrl = (groupHash: string) => getAlertActionUrl(groupHash, '_ack');
export const getUnackAlertActionUrl = (groupHash: string) => getAlertActionUrl(groupHash, '_unack');
export const getAssignAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_assign');
export const getTagAlertActionUrl = (groupHash: string) => getAlertActionUrl(groupHash, '_tag');
export const getSnoozeAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_snooze');
export const getUnsnoozeAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_unsnooze');
export const getActivateAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_activate');
export const getDeactivateAlertActionUrl = (groupHash: string) =>
  getAlertActionUrl(groupHash, '_deactivate');

export const BULK_ALERT_ACTION_URL = `${ALERT_API_PATH}/_bulk_action`;
