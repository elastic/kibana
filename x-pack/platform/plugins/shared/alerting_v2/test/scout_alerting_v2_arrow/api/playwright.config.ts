/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// The `scout_alerting_v2_arrow` path selects the `alerting_v2_arrow` server
// config set, which enables `xpack.alerting_v2.esql.responseFormat: arrow`.
const config = createPlaywrightConfig({ testDir: '../../scout_alerting_v2/api/tests' });
config.testMatch = '**/rule_executor.spec.ts';

export default config;
