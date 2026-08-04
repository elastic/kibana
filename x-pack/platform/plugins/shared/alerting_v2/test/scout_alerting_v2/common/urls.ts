/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type {
  ListPolicyExecutionHistoryRequest,
  listRuleExecutionsRequestSchema,
} from '@kbn/alerting-v2-schemas';
import {
  ALERT_API_PATH,
  ACTION_POLICY_API_PATH,
  RULE_API_PATH,
  EXECUTION_HISTORY_API_PATH,
  RULE_EXECUTIONS_API_PATH,
  RULE_TEMPLATE_API_PATH,
} from './constants';

/**
 * Serializes a query object into a search string. Arrays become repeated
 * `key=value` pairs (e.g. `?tags=a&tags=b`) to match how the routes parse
 * multi-value query params. `undefined` values are dropped.
 */
const toQueryString = (query: Record<string, string | number | string[] | undefined>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
};

/**
 * Pre-parse input shape for {@link listRuleExecutionsUrl}. Kept local because
 * it only matters for tests that build query strings: fields with a Zod
 * `.default(...)` are optional here, and array-like fields accept either a
 * single value or an array (the schema normalizes them at parse time).
 */
type ListRuleExecutionsQueryInput = z.input<typeof listRuleExecutionsRequestSchema>;

/**
 * URL for a single rule resource: `${RULE_API_PATH}/${encodedId}`.
 *
 * Always pass through `encodeURIComponent` so callers cannot accidentally
 * leak unencoded characters into path segments — important for the validation
 * tests that craft pathological ids.
 */
export const getRuleUrl = (id: string) => `${RULE_API_PATH}/${encodeURIComponent(id)}`;
export const getEnableRuleUrl = (id: string) => `${getRuleUrl(id)}/_enable`;
export const getDisableRuleUrl = (id: string) => `${getRuleUrl(id)}/_disable`;

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

export const getBulkDeleteActionPoliciesUrl = () => `${ACTION_POLICY_API_PATH}/_bulk_delete`;

export const getBulkEnableActionPoliciesUrl = () => `${ACTION_POLICY_API_PATH}/_bulk_enable`;

export const getBulkDisableActionPoliciesUrl = () => `${ACTION_POLICY_API_PATH}/_bulk_disable`;

export const getBulkSnoozeActionPoliciesUrl = () => `${ACTION_POLICY_API_PATH}/_bulk_snooze`;

export const getBulkUnsnoozeActionPoliciesUrl = () => `${ACTION_POLICY_API_PATH}/_bulk_unsnooze`;

export const getBulkUpdateApiKeyActionPoliciesUrl = () =>
  `${ACTION_POLICY_API_PATH}/_bulk_update_api_key`;

export const getBulkRulesUrl = () => `${RULE_API_PATH}/_bulk_get`;

export const getRunRuleUrl = (id: string) => `${getRuleUrl(id)}/_run`;

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
/** URL for a single rule template resource. */
export const getRuleTemplateUrl = (id: string) =>
  `${RULE_TEMPLATE_API_PATH}/${encodeURIComponent(id)}`;

/** URL for the find rule templates endpoint, optionally with a query string. */
export const getFindRuleTemplatesUrl = (
  query?: Record<string, string | number | string[] | undefined>
): string => {
  const qs = query ? toQueryString(query) : '';
  return qs ? `${RULE_TEMPLATE_API_PATH}?${qs}` : RULE_TEMPLATE_API_PATH;
};

/** URL for the rule template tags aggregation endpoint. */
export const getRuleTemplateTagsUrl = (query?: { search?: string }): string => {
  const path = `${RULE_TEMPLATE_API_PATH}/_tags`;
  const qs = query ? toQueryString(query) : '';
  return qs ? `${path}?${qs}` : path;
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

/** POST /api/alerting/v2/alerts — source in body */
export const CREATE_ALERT_EVENT_URL = ALERT_API_PATH;

/** POST /api/alerting/v2/alerts/:source — source in path */
export const getCreateAlertEventBySourceUrl = (source: string) =>
  `${ALERT_API_PATH}/${encodeURIComponent(source)}`;

export const getListExecutionHistoryUrl = (query?: ListPolicyExecutionHistoryRequest): string => {
  if (!query) return EXECUTION_HISTORY_API_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.set(key, String(value));
    }
  }
  return `${EXECUTION_HISTORY_API_PATH}?${params.toString()}`;
};

export const listRuleExecutionsUrl = (query?: ListRuleExecutionsQueryInput): string => {
  if (!query) return RULE_EXECUTIONS_API_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.set(key, String(value));
    }
  }
  return `${RULE_EXECUTIONS_API_PATH}?${params.toString()}`;
};
