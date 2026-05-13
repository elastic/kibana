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
    runGlobalSetup: true,
  }),
  testMatch: [
    '**/query_streams/query_stream_nesting_error.spec.ts',
    '**/query_streams/delete_query_stream.spec.ts',
  ],
};
