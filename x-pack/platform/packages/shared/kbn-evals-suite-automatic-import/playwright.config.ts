/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  // Under the CI step timeout in evals.suites.json, so a stuck run fails with a test timeout
  // instead of being killed.
  timeout: 3 * 60 * 60_000,
  // Each example is a full analysis; Task Manager slots and model rate limits are the bottleneck.
  concurrency: 3,
  // Scores for the same dataset vary run to run, so a single run can't tell a change from noise.
  repetitions: 3,
});
