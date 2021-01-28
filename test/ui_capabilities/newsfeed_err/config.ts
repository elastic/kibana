/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
// @ts-ignore untyped module
import getFunctionalConfig from '../../functional/config';

// eslint-disable-next-line import/no-default-export
export default async ({ readConfigFile }: FtrConfigProviderContext) => {
  const functionalConfig = await getFunctionalConfig({ readConfigFile });

  return {
    ...functionalConfig,

    testFiles: [require.resolve('./test')],

    kbnTestServer: {
      ...functionalConfig.kbnTestServer,
      serverArgs: [
        ...functionalConfig.kbnTestServer.serverArgs,
        `--newsfeed.service.pathTemplate=/api/_newsfeed-FTS-external-service-simulators/kibana/crash.json`,
      ],
    },

    junit: {
      reportName: 'Newsfeed Error Handling',
    },
  };
};
