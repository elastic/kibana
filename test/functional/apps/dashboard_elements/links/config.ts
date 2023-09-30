/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('../../../../common/config.js'));
  const functionalConfig = await readConfigFile(require.resolve('../../../config.base.js'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    junit: {
      reportName: 'Dashboard Elements - Links panel tests',
    },
    kbnTestServer: {
      ...commonConfig.get('kbnTestServer'),
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),
        `--externalUrl.policy=${JSON.stringify([
          {
            allow: false,
            host: 'danger.example.com',
          },
          {
            allow: true,
            host: 'example.com',
          },
        ])}`,
      ],
    },
  };
}
