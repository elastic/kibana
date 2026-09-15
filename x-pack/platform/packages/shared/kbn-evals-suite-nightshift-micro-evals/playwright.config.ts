/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

const config = createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: 30 * 60_000,
});
const microConfig: typeof config = {
  ...config,
  globalSetup: [
    ...(typeof config.globalSetup === 'string' ? [config.globalSetup] : config.globalSetup ?? []),
    require.resolve('./src/global_setup'),
  ],
};

export default microConfig;
