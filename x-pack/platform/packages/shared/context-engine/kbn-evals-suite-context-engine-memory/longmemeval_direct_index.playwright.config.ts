/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { defineConfig } from '@playwright/test';

/**
 * LongMemEval-S direct-index suite (elastic/search-team#17382). Each example replaces one
 * shared POC index, so it runs with one worker, one repetition and no retries.
 */
const baseConfig = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  repetitions: 1,
  timeout: 50 * 60_000,
  workers: 1,
});

export default defineConfig({
  ...baseConfig,
  retries: 0,
});
