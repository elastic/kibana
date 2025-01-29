/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const URL_TYPE = {
  KIBANA_DASHBOARD: 'KIBANA_DASHBOARD',
  KIBANA_DISCOVER: 'KIBANA_DISCOVER',
  OTHER: 'OTHER',
};

export const TIME_RANGE_TYPE = {
  AUTO: 'auto',
  INTERVAL: 'interval',
} as const;

export type TimeRangeType = (typeof TIME_RANGE_TYPE)[keyof typeof TIME_RANGE_TYPE];
