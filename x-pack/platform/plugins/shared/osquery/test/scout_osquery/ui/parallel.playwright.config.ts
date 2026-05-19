/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Tier-A: no-Docker specs that run in Scout's default PR pipeline.
 *
 * Global setup installs the `osquery_manager` integration on the Default +
 * Osquery agent policies so the UI renders (no Fleet Server, no agent
 * containers — those live in `real_agent.playwright.config.ts`).
 *
 * Tests that need agent data use seeding helpers from `helpers/data_loaders/`.
 */
const config = createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 1,
  runGlobalSetup: true,
});

export default config;
