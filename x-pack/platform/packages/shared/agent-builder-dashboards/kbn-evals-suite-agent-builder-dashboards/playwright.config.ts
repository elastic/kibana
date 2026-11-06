/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  repetitions: 1,
  // The whole dataset runs in a single test, so the timeout must cover every
  // example serially (each costs several minutes); the default 5 min is not
  // enough. Mirrors the visualization suite.
  timeout: 45 * 60_000,
});
