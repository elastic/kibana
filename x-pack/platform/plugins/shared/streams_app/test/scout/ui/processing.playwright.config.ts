/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Shard 3: Data Processing tests
 * - Processor CRUD operations
 * - Pipeline suggestions
 * - Processing simulation preview
 * - Permissions (editor/viewer)
 */
export default createPlaywrightConfig({
  testDir: './tests/processing',
  runGlobalSetup: true,
});
