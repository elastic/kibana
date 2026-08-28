/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * CPS-local Scout API config for Transform.
 *
 * Run with:
 *   node scripts/scout run-tests \
 *     --arch serverless --domain security_complete --serverConfigSet cps_local \
 *     --config x-pack/platform/plugins/private/transform/test/scout_cps_local/api/playwright.config.ts
 */
export default createPlaywrightConfig({
  testDir: './tests',
  runGlobalSetup: true,
  workers: 1,
});
