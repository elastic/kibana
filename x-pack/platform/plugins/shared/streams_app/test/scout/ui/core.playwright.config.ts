/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Shard 1: Core Streams functionality
 * - Enable/disable wired streams flow
 * - Streams list view tests
 *
 * ~5 test files
 */
export default createPlaywrightConfig({
  testDir: './tests',
  testMatch: [
    'enable_wired_streams_flow.spec.ts',
    'enable_wired_streams_flow_permissions.spec.ts',
    'streams_list_view/**/*.spec.ts',
  ],
  runGlobalSetup: true,
});
