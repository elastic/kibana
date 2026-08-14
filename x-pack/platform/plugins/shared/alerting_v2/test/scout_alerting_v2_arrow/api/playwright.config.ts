/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

// Reuses the existing `scout_alerting_v2` rule-executor spec, but the
// `scout_alerting_v2_arrow` path selects the `alerting_v2_arrow` server config
// set, which enables `xpack.alerting_v2.esql.responseFormat: arrow`. This
// exercises the Arrow ES|QL decode path end-to-end without duplicating tests.
export default {
  ...createPlaywrightConfig({
    testDir: '../../scout_alerting_v2/api/tests',
  }),
  // Only the rule executor exercises the ES|QL streaming decode path, so we
  // scope the Arrow run to that spec rather than the whole API suite.
  testMatch: '**/rule_executor.spec.ts',
};
