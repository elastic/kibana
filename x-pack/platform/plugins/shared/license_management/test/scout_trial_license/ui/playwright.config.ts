/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// The `scout_trial_license` directory name selects the `trial_license` config set, which CI
// runs as its own track with a dedicated cluster — required, as these tests destroy the license.
export default createPlaywrightConfig({
  testDir: './tests',
});
