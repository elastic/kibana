/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

const config = createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});

// Setup is a one-way server mutation, so retries cannot start from the required fresh state.
config.retries = 0;

export default config;
