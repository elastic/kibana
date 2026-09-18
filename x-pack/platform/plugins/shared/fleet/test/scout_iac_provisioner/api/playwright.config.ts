/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
  // Every spec in this suite toggles the server-wide
  // fleet.enableIacProvisioner feature flag in beforeAll/afterAll. Pin a
  // single worker explicitly (Scout's current default) so the flag-on and
  // flag-off suites can never interleave if the default or a CLI override
  // ever changes.
  workers: 1,
});
