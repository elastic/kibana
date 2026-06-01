/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { defineConfig } from '@playwright/test';

const DEFAULT_STREAM_EVAL_WORKERS = 20;

function resolveStreamEvalWorkers(): number {
  const raw = process.env.STREAM_EVALS_WORKERS;
  if (raw === undefined || raw === '') {
    return DEFAULT_STREAM_EVAL_WORKERS;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_STREAM_EVAL_WORKERS;
  }
  return n;
}

const baseConfig = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  runGlobalSetup: true,
});

export default defineConfig({
  ...baseConfig,
  workers: resolveStreamEvalWorkers(),
  fullyParallel: true,
});
