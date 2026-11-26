/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALL_VALUE = '*';

export const SLO_GROUPINGS_PREFIX = 'slo.groupings.';

export const SLO_STATUS = {
  NO_DATA: 'NO_DATA',
  HEALTHY: 'HEALTHY',
  DEGRADING: 'DEGRADING',
  VIOLATED: 'VIOLATED',
} as const;

export const SLI_RETENTION_MIN_PERIOD_DAYS = 180;
export const SLI_RETENTION_MAX_PERIOD_DAYS = 3650;
export const SLI_RETENTION_DEFAULT_PERIOD_DAYS = 365;
