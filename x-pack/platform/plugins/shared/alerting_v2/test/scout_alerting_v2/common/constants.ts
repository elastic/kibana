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
 * Test-side mirrors of action policy schema/route limits that are *not* exported by
 * `@kbn/alerting-v2-schemas` (they're inline `.max(...)` literals in the route /
 * schema source). Keeping them centralized here means a boundary test breaks
 * loudly in one place if the route ever loosens its limits. If any of these are
 * later promoted to exported schema constants, import from the schemas package
 * instead and delete the mirror here.
 */
export const ACTION_POLICY_MAX_DESTINATIONS = 10;
export const ACTION_POLICY_VERSION_MAX_LENGTH = 256;
export const ACTION_POLICY_PER_PAGE_MAX = 100;
export const ACTION_POLICY_SEARCH_MAX_LENGTH = 256;
export const ACTION_POLICY_TAGS_MAX_COUNT = 10;
export const ACTION_POLICY_TAG_MAX_LENGTH = 128;
export const ACTION_POLICY_CREATED_BY_MAX_LENGTH = 256;

export {
  ALERTING_V2_RULE_API_PATH as RULE_API_PATH,
  ALERTING_V2_RULE_DOCTOR_INSIGHTS_API_PATH as INSIGHTS_API_PATH,
  ALERTING_V2_ACTION_POLICY_API_PATH as ACTION_POLICY_API_PATH,
} from '@kbn/alerting-v2-constants';
export { ALERT_EVENTS_DATA_STREAM } from '../../../server/resources/datastreams/alert_events';
export { ALERT_ACTIONS_DATA_STREAM } from '../../../server/resources/datastreams/alert_actions';
export { RULE_DOCTOR_INSIGHTS_INDEX } from '../../../server/resources/indices/rule_doctor_insights';
export { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../server/saved_objects';
