/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test';

/*
 * These tests exist in a separate configuration because:
 * 1) It must run as the first test after Kibana launches to clear the unavailable status. A separate config makes this
 *    easier to manage and prevent from breaking.
 * 2) The other server_integration tests run against a built distributable, however the FTR does not support building
 *    and installing plugins against built Kibana. This test must be run against source only in order to build the
 *    fixture plugins
 */
// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../config'));

  return {
    testFiles: [require.resolve('./analytics')],
    services: baseConfig.get('services'),
    servers: baseConfig.get('servers'),
    junit: {
      reportName: 'Kibana Platform Analytics Integration Tests',
    },
    esTestCluster: baseConfig.get('esTestCluster'),
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${path.resolve(__dirname, '../__fixtures__/plugins/analytics_plugin_a')}`,
      ],
    },
  };
}
