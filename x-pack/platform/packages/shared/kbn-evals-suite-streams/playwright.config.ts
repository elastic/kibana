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
});

export default defineConfig({
  ...baseConfig,
  workers: 20,
  fullyParallel: true,
  projects: [
    // Single shared setup project — runs once before all connector projects
    {
      name: 'setup',
      testDir: Path.resolve(__dirname, './evals/setup'),
      testMatch: /streams_setup\.spec\.ts/,
      use: baseConfig.projects?.[0]?.use,
    },
    // All connector projects depend on the shared setup and teardown
    ...(baseConfig.projects?.map((project) => ({
      ...project,
      testIgnore: [/setup\//, /teardown\//],
      dependencies: ['setup'],
      teardown: 'teardown',
    })) ?? []),
    // Single shared teardown project — runs once after all connector projects
    {
      name: 'teardown',
      testDir: Path.resolve(__dirname, './evals/teardown'),
      testMatch: /streams_teardown\.spec\.ts/,
      use: baseConfig.projects?.[0]?.use,
    },
  ],
});
