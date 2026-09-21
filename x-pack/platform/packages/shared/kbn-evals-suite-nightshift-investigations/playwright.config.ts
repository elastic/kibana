/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

const selection = process.env.NIGHTSHIFT_DATASETS;
if (selection && !['all', 'investigate-lite', 'synthetic-smoke'].includes(selection)) {
  throw new Error(
    `Unknown NIGHTSHIFT_DATASETS: ${selection}. Choose investigate-lite or synthetic-smoke.`
  );
}

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: 55 * 60_000,
  testIgnore:
    process.env.NIGHTSHIFT_DATASETS === 'synthetic-smoke' ? '**/golden/**' : '**/smoke/**',
});
