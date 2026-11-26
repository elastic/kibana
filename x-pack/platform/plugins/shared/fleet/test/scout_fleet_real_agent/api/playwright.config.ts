/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * Sequential: one Fleet Server and the agents of a test share one stack.
 * Must stay in `excluded_configs` — default Scout CI has no Docker Fleet Server.
 */
export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
});
