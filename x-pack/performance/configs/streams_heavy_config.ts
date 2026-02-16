/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

/**
 * Extended FTR config for heavy Streams performance journeys (e.g. large wired hierarchy).
 * Increases mochaOpts.timeout to 20 minutes to accommodate bulk stream creation in beforeSteps.
 */
// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./http2_config'));

  return {
    ...baseConfig.getAll(),
    mochaOpts: {
      ...baseConfig.get('mochaOpts'),
      timeout: 1_200_000, // 20 minutes
    },
  };
}
