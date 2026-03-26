/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_HEADERS = {
  'kbn-xsrf': 'true',
};

// Must match ALERTING_V2_RULE_API_PATH in server/routes/constants.ts
export const RULE_API_PATH = '/api/alerting/v2/rules';
export const ALERTING_EVENTS_INDEX = '.rule-events';
