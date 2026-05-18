/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;

export const SCHEDULE_INTERVAL = '5s';
export const LOOKBACK_WINDOW = '1m';
export const POLL_TIMEOUT_MS = 45_000;
export const POLL_INTERVAL_MS = 1_000;

/**
 * Action types written by the alerting_v2 dispatcher (store_actions_step) into
 * `.alert-actions`. Tests that assert "user-written" actions must filter these
 * out, otherwise they can flakily observe `unmatched` / `notified` instead of
 * the action they POSTed (e.g. `ack`, `tag`).
 */
export const DISPATCHER_SYSTEM_ACTION_TYPES = [
  'fire',
  'suppress',
  'unmatched',
  'notified',
] as const;

export {
  ALERTING_V2_RULE_API_PATH as RULE_API_PATH,
  ALERTING_V2_ALERT_API_PATH as ALERT_API_PATH,
  ALERTING_V2_RULE_DOCTOR_INSIGHTS_API_PATH as INSIGHTS_API_PATH,
  ALERTING_V2_ACTION_POLICY_API_PATH as ACTION_POLICY_API_PATH,
} from '@kbn/alerting-v2-constants';
export { ALERT_EVENTS_DATA_STREAM } from '../../../server/resources/datastreams/alert_events';
export { ALERT_ACTIONS_DATA_STREAM } from '../../../server/resources/datastreams/alert_actions';
export { RULE_DOCTOR_INSIGHTS_INDEX } from '../../../server/resources/indices/rule_doctor_insights';
