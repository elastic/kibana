/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/** Fleet + agent enrollment + osquery warm-up can exceed the default 3m setup project budget. */
const OSQUERY_UI_GLOBAL_SETUP_TIMEOUT_MS = 600_000;

const baseConfig = createPlaywrightConfig({
  testDir: './parallel_tests',
  // Osquery Scout UI targets the default Kibana space (Fleet + agents from global setup). A single
  // worker avoids parallel tests mutating the same saved objects and Chrome sessions. Revisit raising
  // this only if tests gain strong isolation (unique names alone are not enough for Fleet-backed flows).
  workers: 1,
  runGlobalSetup: true,
});

const projects = baseConfig.projects?.map((project) => {
  if (typeof project === 'object' && project?.name?.startsWith('setup-')) {
    return { ...project, timeout: OSQUERY_UI_GLOBAL_SETUP_TIMEOUT_MS };
  }

  return project;
});

const config: typeof baseConfig = {
  ...baseConfig,
  projects,
};

export default config;
