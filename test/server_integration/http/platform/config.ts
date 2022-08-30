/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const httpConfig = await readConfigFile(require.resolve('../../config.base.js'));

  return {
    testFiles: [require.resolve('./cache'), require.resolve('./headers')],
    services: httpConfig.get('services'),
    servers: httpConfig.get('servers'),
    junit: {
      reportName: 'Kibana Platform Http Integration Tests',
    },
    esTestCluster: httpConfig.get('esTestCluster'),
    kbnTestServer: httpConfig.get('kbnTestServer'),
  };
}
