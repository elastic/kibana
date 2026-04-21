/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/** Fleet + agent enrollment + osquery warm-up can exceed the default 3m setup project budget. */
const OSQUERY_UI_GLOBAL_SETUP_TIMEOUT_MS = 600_000;
const OSQUERY_UI_GLOBAL_TEARDOWN_TIMEOUT_MS = 180_000;

const baseConfig = createPlaywrightConfig({
  testDir: './parallel_tests',
  // Osquery Scout UI targets the default Kibana space (Fleet + agents from global setup). A single
  // worker avoids parallel tests mutating the same saved objects and Chrome sessions. Revisit raising
  // this only if tests gain strong isolation (unique names alone are not enough for Fleet-backed flows).
  workers: 1,
  runGlobalSetup: true,
});

// Scout's `createPlaywrightConfig` builds `setup-<env>` projects that `<env>` depends on, but it
// doesn't support a matching teardown. We bolt one on using Playwright's native `teardown` link:
// each setup project gets `teardown: 'teardown-<env>'`, and we append a teardown project that
// runs `global.teardown.ts`. Teardowns execute after the setup's dependents finish regardless of
// pass/fail, which is exactly what we need to stop the Fleet/agent Docker containers spun up in
// `global.setup.ts`.
const TEARDOWN_PATTERN = /global\.teardown\.ts/;
const teardownProjectNames = new Set<string>();

const projectsWithTimings = baseConfig.projects?.map((project) => {
  if (typeof project !== 'object' || !project) return project;

  if (project.name?.startsWith('setup-')) {
    const env = project.name.replace('setup-', '');
    const teardownName = `teardown-${env}`;
    teardownProjectNames.add(teardownName);

    return {
      ...project,
      timeout: OSQUERY_UI_GLOBAL_SETUP_TIMEOUT_MS,
      teardown: teardownName,
    };
  }

  return project;
});

const teardownProjects = Array.from(teardownProjectNames).map((name) => {
  // Find the matching setup project to inherit `use` (configName etc.) so the teardown runs in
  // the same environment as its setup/tests.
  const sibling = baseConfig.projects?.find(
    (p) => typeof p === 'object' && p?.name === `setup-${name.replace('teardown-', '')}`
  );
  const use = (sibling && typeof sibling === 'object' && sibling.use) || {};

  return {
    name,
    testDir: './parallel_tests',
    testMatch: TEARDOWN_PATTERN,
    timeout: OSQUERY_UI_GLOBAL_TEARDOWN_TIMEOUT_MS,
    use,
  };
});

const config: typeof baseConfig = {
  ...baseConfig,
  projects: [...(projectsWithTimings ?? []), ...teardownProjects],
};

export default config;
