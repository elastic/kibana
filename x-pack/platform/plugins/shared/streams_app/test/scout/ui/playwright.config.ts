/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMPORARY: narrowed to failure_store.spec.ts for flaky test runner validation.
// Revert this change before merging.
import { createPlaywrightConfig } from '@kbn/scout';

const config = createPlaywrightConfig({
  testDir: './tests',
  runGlobalSetup: true,
});

export default { ...config, testMatch: '**/failure_store.spec.ts' };
