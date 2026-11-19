/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

/**
 * The `scout_search_sessions` directory name is load-bearing: Scout derives the server config set
 * from it, and that set is what starts Kibana with `--data.search.sessions.enabled=true`. Renaming
 * the directory silently falls back to the `default` set and every spec here runs against a server
 * with background search switched off.
 */
export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
