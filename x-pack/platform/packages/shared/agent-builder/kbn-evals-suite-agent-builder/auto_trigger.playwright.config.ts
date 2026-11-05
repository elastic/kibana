/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * `trigger_mode: 'auto'` decisions. Run with the `evals_agent_builder` server config set for the
 * EIS decision model, or `evals_agent_builder_fast_decisions` for the fast model under test.
 */
export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals/auto_trigger'),
  repetitions: 3,
  timeout: 30 * 60_000,
});
