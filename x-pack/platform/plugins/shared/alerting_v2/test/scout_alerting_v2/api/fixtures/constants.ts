/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_HEADERS = {
  'kbn-xsrf': 'true',
};

export { ALERTING_V2_RULE_API_PATH as RULE_API_PATH } from '@kbn/alerting-v2-constants';
export { ALERTING_V2_RULE_DOCTOR_INSIGHTS_API_PATH as INSIGHTS_API_PATH } from '@kbn/alerting-v2-constants';
export { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '../../../../common/advanced_settings';
export const ALERTING_EVENTS_INDEX = '.rule-events';
export const RULE_DOCTOR_INSIGHTS_INDEX = '.rule-doctor-insights';
