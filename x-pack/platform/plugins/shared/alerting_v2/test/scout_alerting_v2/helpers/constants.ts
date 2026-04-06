/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Default ES|QL used by Scout helpers when creating minimal listable rules (no custom index). */
export const SCOUT_DEFAULT_RULE_EVALUATION_QUERY =
  'FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1';

export const SCOUT_DEFAULT_RULE_SCHEDULE = {
  every: '1h',
  lookback: '1h',
} as const;
