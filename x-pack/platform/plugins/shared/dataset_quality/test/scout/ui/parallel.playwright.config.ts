/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// These suites only touch their own data streams, templates and pipelines, so they can
// run in parallel. Suites that install Fleet packages or edit an integration's `@custom`
// component template, which are shared across the cluster, stay in the sequential `./tests`
// config. The global setup and teardown delete what these suites create.
export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
