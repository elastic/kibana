/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 3,
  runGlobalSetup: false, // TODO: enable global setup once we have a global setup for GenAI Settings
});
