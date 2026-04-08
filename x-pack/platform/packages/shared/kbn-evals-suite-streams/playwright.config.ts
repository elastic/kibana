/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { defineConfig } from '@playwright/test';

const GLOBAL_SETUP_TIMEOUT_MS = 180_000;

const baseConfig = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
});

export default defineConfig({
  ...baseConfig,
  workers: 20,
  fullyParallel: true,
  projects:
    baseConfig.projects?.flatMap((project) => [
      {
        name: `setup-${project.name}`,
        use: project.use,
        testMatch: /global\.setup\.ts/,
        timeout: GLOBAL_SETUP_TIMEOUT_MS,
      },
      {
        ...project,
        dependencies: [`setup-${project.name}`],
      },
    ]) ?? [],
});
