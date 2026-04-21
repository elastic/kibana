/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PlaywrightTestConfig } from 'playwright/test';
import { createPlaywrightConfig } from '@kbn/scout';

/** Fleet + agent enrollment + osquery warm-up can exceed the default 3m setup project budget. */
const OSQUERY_UI_GLOBAL_SETUP_TIMEOUT_MS = 600_000;

const baseConfig = createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});

const projects = baseConfig.projects?.map((project) => {
  if (typeof project === 'object' && project?.name?.startsWith('setup-')) {
    return { ...project, timeout: OSQUERY_UI_GLOBAL_SETUP_TIMEOUT_MS };
  }

  return project;
});

const config: PlaywrightTestConfig = {
  ...baseConfig,
  projects,
};

export default config;
