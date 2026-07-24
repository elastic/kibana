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
  // The seeded replay fits comfortably here; the live replay spec raises its own per-test
  // timeout (hours) since it streams the incident tail at 1x wall clock.
  timeout: 30 * 60_000, // 30 minutes
});
