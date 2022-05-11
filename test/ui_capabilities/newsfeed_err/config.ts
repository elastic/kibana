/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';

// eslint-disable-next-line import/no-default-export
export default async ({ readConfigFile }: FtrConfigProviderContext) => {
  const baseConfig = await readConfigFile(require.resolve('../../functional/config.base.js'));

  return {
    ...baseConfig.getAll(),

    testFiles: [require.resolve('./test')],

    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        `--newsfeed.service.pathTemplate=/api/_newsfeed-FTS-external-service-simulators/kibana/crash.json`,
      ],
    },

    junit: {
      reportName: 'Newsfeed Error Handling',
    },
  };
};
