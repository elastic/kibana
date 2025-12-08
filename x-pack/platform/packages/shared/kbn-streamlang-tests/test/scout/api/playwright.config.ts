/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Initialize Peggy require hook for .peggy grammar files.
import '../../../peggy_loader';

import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1, // Parallel execution causes resource conflicts
});
