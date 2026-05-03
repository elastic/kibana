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

export {
  ALERTING_V2_RULE_API_PATH as RULE_API_PATH,
  ALERTING_V2_RULE_DOCTOR_INSIGHTS_API_PATH as INSIGHTS_API_PATH,
} from '@kbn/alerting-v2-constants';
export { ALERT_EVENTS_DATA_STREAM } from '../../../server/resources/datastreams/alert_events';
export { ALERT_ACTIONS_DATA_STREAM } from '../../../server/resources/datastreams/alert_actions';
export { RULE_DOCTOR_INSIGHTS_INDEX } from '../../../server/resources/indices/rule_doctor_insights';
