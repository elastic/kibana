/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Playwright config for osquery tests that require custom server config sets.
 *
 * The `scout_osquery` directory name triggers Scout's auto-detection:
 * it resolves to `config_sets/osquery/serverless/` instead of the default,
 * providing Security Complete WITHOUT Endpoint Complete for tier gating tests.
 */
export default createPlaywrightConfig({
  testDir: './tests',
});
