/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  repetitions: 1,
  // Each example drives a full Agent Builder `converse` round-trip (skill
  // load + create_visualization tool loop) plus several CODE evaluators and
  // LLM judges. The whole dataset runs in a single test, so the per-test
  // timeout must cover every example serially — the default 5 min is not
  // enough. Mirrors the security ES|QL suite.
  // ~17 examples × converse + evaluators; keep headroom for retries / slow models.
  timeout: 45 * 60_000,
});

// Agent loops introduce LLM-side timing variance (parallel tool calls,
// occasional rate-limit retries). Two retries keep the suite robust against
// transient failures without masking real regressions.
config.retries = 2;

export default config;
