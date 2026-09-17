/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

const selection = process.env.NIGHTSHIFT_DATASETS;
if (selection && !['all', 'investigate-lite', 'synthetic-smoke', 'remote'].includes(selection)) {
  throw new Error(
    `Unknown NIGHTSHIFT_DATASETS: ${selection}. Choose investigate-lite, synthetic-smoke or remote.`
  );
}

// Each selector runs exactly one eval folder; the golden lite eval is the default.
const testIgnore: Record<string, string[]> = {
  'synthetic-smoke': ['**/golden/**', '**/remote/**'],
  remote: ['**/golden/**', '**/smoke/**'],
};

const config = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: 55 * 60_000,
  testIgnore: testIgnore[selection ?? ''] ?? ['**/smoke/**', '**/remote/**'],
});

const goldenConfig: typeof config = {
  ...config,
  globalSetup: [
    ...(typeof config.globalSetup === 'string' ? [config.globalSetup] : config.globalSetup ?? []),
    require.resolve('./evals/golden/global_setup'),
  ],
};

export default goldenConfig;
