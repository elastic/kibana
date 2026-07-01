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
  // The dashboard-management flows are multi-turn (create -> add sections -> lay out
  // panels) and the slowest weekly model (gemini-3-1-pro) legitimately exceeds the
  // shared 5-minute per-test default, timing out 2/5 tests every run while the other
  // models pass. Raise the budget for this suite only so the slow model completes.
  timeout: 10 * 60_000,
});
