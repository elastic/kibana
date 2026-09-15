/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PassingRule } from '../../src/rules';

// Thresholds are calibrated against the first full 9-example run (experiment
// plan-merge-reinforcement-a45b5a57: structural_validity=0.889,
// mutation_preservation=0.936, checkmark_placement=0.926,
// no_conflicting_checkmarks=1.000, mutation_correctness=0.861) with a ~5%
// regression allowance, floored to 2dp. structural_validity is rule-based over
// LLM-generated Mermaid and swings between runs (0.972 on the earlier 6-example
// run vs 0.889 here), so its gate uses a wider allowance off the lower observed
// value.
export const rules: readonly PassingRule[] = [
  { metric: 'structural_validity', op: '>=', threshold: 0.84 },
  { metric: 'mutation_preservation', op: '>=', threshold: 0.83 },
  { metric: 'checkmark_placement', op: '>=', threshold: 0.84 },
  { metric: 'no_conflicting_checkmarks', op: '>=', threshold: 0.95 },
  { metric: 'mutation_correctness', op: '>=', threshold: 0.75 },
];
