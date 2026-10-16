/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * Agent Builder engineering-regression suite (elastic/search-team#16080): small fixed
 * datasets run per-PR to detect cost/speed/quality regressions against a pinned baseline.
 *
 * Intentionally separate from the broad `agent-builder` suite: fixed datasets and a
 * fixed evaluator set (do not set SELECTED_EVALUATORS in CI — gates pair scores by
 * evaluator name across runs). Use EVAL_REPETITIONS for higher-confidence runs.
 */
export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals/analytical'),
  repetitions: 1,
  timeout: 60 * 60_000, // 1 hour — the suite must stay small enough to run per-PR
  workers: 2,
});
