/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

export default {
  ...createPlaywrightConfig({
    testDir: './tests',
    workers: 1,
    runGlobalSetup: true,
  }),
  // Osquery tests involve agent communication, live-query execution, alert generation
  // and pack triggering — all of which can take well over the default 60 s.
  timeout: 300_000,
};
