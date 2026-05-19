/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/scout_test_file_naming */
import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Tier-B (nightly): real-agent integration coverage that requires Docker +
 * Fleet Server + Elastic Agent. Run by the dedicated
 * `kibana-scout-osquery-agents` Buildkite pipeline owned by
 * security-defend-workflows; explicitly listed under `excluded_configs` in
 * `.buildkite/scout_ci_config.yml` so it never runs in the default PR pipeline.
 *
 * Specs in `./real_agent_tests/` exercise the integration boundary between
 * osquery and Fleet — agent enrollment, real live-query round trips, real
 * scheduled pack execution, and real detection-rule response actions. Use the
 * sibling `parallel.playwright.config.ts` (Tier-A) when you only need the
 * osquery UI surface with mocked agents.
 *
 * Global setup/teardown orchestrate Docker containers (Fleet Server + 2 Elastic
 * Agents). See `real_agent_tests/global.setup.ts` and
 * `real_agent_tests/global.teardown.ts`.
 */
const OSQUERY_AGENTS_GLOBAL_SETUP_TIMEOUT_MS = 600_000;
const OSQUERY_AGENTS_GLOBAL_TEARDOWN_TIMEOUT_MS = 180_000;

const baseConfig = createPlaywrightConfig({
  testDir: './real_agent_tests',
  workers: 1,
  runGlobalSetup: true,
});

const projectsWithTimings = baseConfig.projects?.map((project) => {
  if (typeof project !== 'object' || !project) return project;

  if (project.name?.startsWith('setup-')) {
    return { ...project, timeout: OSQUERY_AGENTS_GLOBAL_SETUP_TIMEOUT_MS };
  }

  if (project.name?.startsWith('teardown-')) {
    return { ...project, timeout: OSQUERY_AGENTS_GLOBAL_TEARDOWN_TIMEOUT_MS };
  }

  return project;
});

const config: typeof baseConfig = {
  ...baseConfig,
  projects: projectsWithTimings,
};

export default config;
