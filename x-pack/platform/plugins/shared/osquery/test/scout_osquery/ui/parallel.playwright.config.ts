/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

const parallelJobCount = process.env.BUILDKITE_PARALLEL_JOB_COUNT
  ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
  : undefined;
const parallelJobIndex = process.env.BUILDKITE_PARALLEL_JOB
  ? parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10)
  : undefined;

const config: ReturnType<typeof createPlaywrightConfig> = {
  ...createPlaywrightConfig({
    testDir: './tests',
    workers: 1,
    runGlobalSetup: true,
  }),
  timeout: 300_000,
  retries: process.env.CI ? 1 : 0,
  ...(parallelJobCount && parallelJobIndex !== undefined
    ? {
        shard: {
          total: parallelJobCount,
          current: parallelJobIndex + 1, // Buildkite is 0-based, Playwright is 1-based
        },
      }
    : {}),
};

export default config;
