/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
  // Five specs still seed the shared `synth.1/2/3` data sets and call
  // `logsSynthtraceEsClient.clean()`, which deletes every `logs-*-*` data stream
  // cluster-wide, so a single worker keeps them from racing. Moving them onto per-spec
  // prefixes to raise the worker count is tracked in
  // https://github.com/elastic/kibana/issues/287029.
  workers: 1,
});
