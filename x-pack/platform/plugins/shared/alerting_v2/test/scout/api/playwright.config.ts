/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// Runs against the generic (default) Scout server config so the suite is
// deployment-agnostic. It relies only on out-of-the-box defaults: on stateful
// the Alerting V2 plugin is enabled with `alerting:v2:enabled` off, and on
// serverless the plugin is disabled entirely.
export default createPlaywrightConfig({
  testDir: './tests',
});
