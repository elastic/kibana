/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable import/no-default-export */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...baseConfig.getAll(),

    testFiles: [
      require.resolve('../apps/discover/classic'),
      require.resolve('../apps/discover/group1'),
      require.resolve('../apps/discover/group2'),
      require.resolve('../apps/discover/group3'),
      require.resolve('../apps/discover/group4'),
    ],

    junit: {
      reportName: 'Firefox UI Functional Tests - Discover',
    },
  };
}
