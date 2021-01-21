/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { services } from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [require.resolve('./apis')],
    services,
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'API Integration Tests',
    },
    esTestCluster: commonConfig.get('esTestCluster'),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--elasticsearch.healthCheck.delay=3600000',
        '--server.xsrf.disableProtection=true',
        '--server.compression.referrerWhitelist=["some-host.com"]',
      ],
    },
  };
}
