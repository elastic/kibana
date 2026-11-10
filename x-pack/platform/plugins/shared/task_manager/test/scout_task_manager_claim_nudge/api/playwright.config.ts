/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
  // Otherwise the manifest regenerates with only `ci-on-commit`.
  metadata: { scout: { testChannels: ['ci-on-commit', 'ci-batch-3h'] } },
});
