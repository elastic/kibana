/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { defineConfig } from '@playwright/test';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default defineConfig({
  ...createPlaywrightEvalsConfig({
    testDir: Path.resolve(__dirname, './evals/security/prompt_injection'),
    // Weekly CI sets EVAL_REPETITIONS=3; keep local and PR runs small by default.
    repetitions: 1,
    concurrency: 1,
    timeout: 10 * 60_000,
    workers: 1,
  }),
  // A successful retry must not hide a security failure from an earlier trial.
  retries: 0,
});
