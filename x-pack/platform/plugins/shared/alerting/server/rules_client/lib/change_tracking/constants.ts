/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_RULE_DATASET = 'alerting-rules';

export const ALERTING_RULE_CHANGE_HISTORY_SENSITIVE_FIELDS = {
  attributes: { apiKey: true, uiamApiKey: true },
} as const;
