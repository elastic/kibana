/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Shard 2: Data Routing tests
 * - Routing rules CRUD operations
 * - AI suggestions for partitioning
 * - Routing data preview
 */
export default createPlaywrightConfig({
  testDir: './tests/routing',
  runGlobalSetup: true,
});
