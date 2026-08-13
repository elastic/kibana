/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './src';

export const DEFAULT_TIME_FIELD = '@timestamp';
export const ALERT_EVENTS_DATA_STREAM = '.rule-events';
export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';

export const ALERTING_V2_SECTION_ID = 'alertingV2';
export const ALERTING_V2_RULES_APP_ID = 'rules';
export const ALERTING_V2_ACTION_POLICIES_APP_ID = 'action_policies';
export const ALERTING_V2_EPISODES_APP_ID = 'episodes';
export const ALERTING_V2_EXECUTION_HISTORY_APP_ID = 'execution_history';

export const ALERTING_V2_RULE_API_PATH = '/api/alerting/v2/rules' as const;
export const ALERTING_V2_RULE_CHANGE_HISTORY_API_PATH =
  `${ALERTING_V2_RULE_API_PATH}/{id}/history` as const;
export const ALERTING_V2_ALERT_API_PATH = '/api/alerting/v2/alerts' as const;
export const ALERTING_V2_ACTION_POLICY_API_PATH = '/api/alerting/v2/action_policies' as const;
export const ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH =
  '/api/alerting/v2/execution_history/action_policies' as const;
export const ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH =
  '/api/alerting/v2/execution_history/rules' as const;
export const ALERTING_V2_SUGGESTIONS_RULE_EVENT_FIELDS_API_PATH =
  '/api/alerting/v2/suggestions/rule_event_fields' as const;
export const ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH =
  '/internal/alerting/v2/suggestions/values' as const;
export const ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH =
  '/internal/alerting/v2/suggestions/user_profiles' as const;
