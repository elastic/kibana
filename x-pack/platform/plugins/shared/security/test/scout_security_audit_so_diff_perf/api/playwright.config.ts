/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// Measurement suite, not a regression gate: not run in CI (excluded in
// .buildkite/scout_ci_config.yml); run by hand, see ../README.md.
export default createPlaywrightConfig({
  testDir: './tests',
});
