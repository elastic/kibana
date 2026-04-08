/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { defineConfig } from '@playwright/test';

const baseConfig = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  runGlobalSetup: true,
});

export default defineConfig({
  ...baseConfig,
  workers: 20,
  fullyParallel: true,
});
