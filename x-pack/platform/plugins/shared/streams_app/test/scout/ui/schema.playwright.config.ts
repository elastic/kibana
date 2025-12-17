/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Shard 4: Data Retention, Schema & Quality tests
 * - Data retention configuration
 * - ILM policy retention
 * - Failure store
 * - Schema mapping (classic & wired)
 * - Data quality
 * - Stream header
 *
 * ~12 test files
 */
export default createPlaywrightConfig({
  testDir: './tests',
  testMatch: [
    'data_management/data_retention/**/*.spec.ts',
    'data_management/data_mapping/**/*.spec.ts',
    'data_management/data_quality.spec.ts',
    'data_management/streams_header.spec.ts',
  ],
  runGlobalSetup: true,
});

