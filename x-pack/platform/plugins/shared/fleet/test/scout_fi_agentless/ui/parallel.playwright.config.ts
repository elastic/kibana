/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Playwright configuration for the Fleet Identity Federation agentless Scout suite.
 *
 * The `scout_fi_agentless` directory name triggers automatic detection of the
 * `fi_agentless` server config set (see detect_custom_config.ts in kbn-scout).
 * That config set enables:
 *   - xpack.fleet.agentless.enabled: true
 *   - xpack.fleet.enableExperimental: ['agentlessPoliciesAPI', 'useAgentlessAPIInUI', 'cloud_connectors']
 *   - uiSettings.overrides.securitySolution:enableCloudConnector: true
 *   - aws package pre-installed at startup
 *
 * Run locally:
 *   node scripts/scout.js run-tests \
 *     --arch stateful --domain classic \
 *     --config x-pack/platform/plugins/shared/fleet/test/scout_fi_agentless/ui/parallel.playwright.config.ts
 */

import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests/',
  workers: 2,
  runGlobalSetup: true,
});
