/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// The 'scout_triggers_actions_ui' directory name auto-selects the
// 'triggers_actions_ui' kbn-scout config set, which extends the default
// config with preconfigured connectors needed by the tests here.
export default createPlaywrightConfig({
  testDir: './tests',
});
