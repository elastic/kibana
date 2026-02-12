/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '@kbn/alerting-v2-schemas';

export const ALERTING_V2_APP_ID = 'alerting_v2';
export const ALERTING_V2_APP_ROUTE = '/alerting_v2';
export const INTERNAL_ALERTING_V2_RULE_API_PATH = '/internal/alerting/v2/rule' as const;

export const DEFAULT_RULE_VALUES: CreateRuleData = {
  name: '',
  kind: 'alert',
  tags: [],
  schedule: { custom: '5m' },
  enabled: true,
  query: '',
  timeField: '',
  lookbackWindow: '5m',
  groupingKey: [],
};
