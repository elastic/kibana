/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import type { PlaywrightTestConfig } from '@playwright/test';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

// Using evals config to get all the right fixtures, such as EvaluationAnalysisService
const baseConfig = createPlaywrightEvalsConfig({
  testDir: Path.join(__dirname, './reports'),
});

// Override projects to only include a single project for reporting
// eslint-disable-next-line import/no-default-export
export default {
  ...baseConfig,
  projects: [
    {
      name: 'reporting',
      use: baseConfig.projects?.[0]?.use || {},
    },
  ],
} as PlaywrightTestConfig;
