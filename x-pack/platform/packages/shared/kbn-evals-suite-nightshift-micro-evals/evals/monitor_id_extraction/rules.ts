/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PassingRule } from '../../src/rules';

// Thresholds are the most recent full run's mean scores (experiment
// monitor-id-extraction-10c4e780, 30 examples: exact_match=0.967,
// non_empty_output=0.967, format_validity=1.000) with a 5% regression
// allowance, floored to 2dp.
export const rules: readonly PassingRule[] = [
  { metric: 'exact_match', op: '>=', threshold: 0.91 },
  { metric: 'non_empty_output', op: '>=', threshold: 0.91 },
  { metric: 'format_validity', op: '>=', threshold: 0.95 },
];
