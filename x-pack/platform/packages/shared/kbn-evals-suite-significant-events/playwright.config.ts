/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { SIGEVENTS_GROUND_TRUTH_SOURCE } from './src/data_generators/snapshot_run_config';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  // The default Playwright test timeout (5m) is too low for some connector/model combinations.
  // Keep this high enough to avoid spurious timeouts, and use CI step timeouts to bound runtime.
  timeout: 30 * 60_000, // 30 minutes
  // Ground truth (criteria, expected features) lives in GCS next to the snapshots; the global
  // setup downloads it once per run. See README "Ground truth".
  groundTruth: SIGEVENTS_GROUND_TRUTH_SOURCE,
});
