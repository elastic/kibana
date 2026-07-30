/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// `workers: 1` is required, not just the default: these specs mutate
// cluster-global `cluster.remote.*` persistent settings and assert on
// empty-list state, so they must not run in parallel.
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
