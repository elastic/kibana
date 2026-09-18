/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PassingRule } from '../../src/rules';

// Thresholds guard against regression, calibrated against observed run-to-run
// variance rather than a single baseline. taken_path_coverage is a rule-based
// metric parsed from LLM-generated Mermaid, so it swings materially between runs
// (0.999 on plan-extraction-29bdc52d vs 0.930 on plan-extraction-... in CI); its
// gate uses a ~10% allowance off the higher baseline. The others sit ~5% below
// their most recent full-run means (experiment plan-extraction-29bdc52d, 20
// examples: structural_validity=0.992, evolution_preservation=0.942,
// llm_judge_quality=0.188). llm_judge_quality is a strict 1-5 rubric that scores
// low in absolute terms; the gate guards against further regression rather than
// asserting a high bar.
export const rules: readonly PassingRule[] = [
  { metric: 'structural_validity', op: '>=', threshold: 0.94 },
  { metric: 'taken_path_coverage', op: '>=', threshold: 0.88 },
  { metric: 'evolution_preservation', op: '>=', threshold: 0.89 },
  { metric: 'llm_judge_quality', op: '>=', threshold: 0.17 },
];
