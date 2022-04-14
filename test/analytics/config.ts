/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

/*
 * These tests exist in a separate configuration because:
 * 1) The FTR does not support building and installing plugins against built Kibana.
 *    This test must be run against source only in order to build the fixture plugins.
 * 2) It provides a specific service to make EBT testing easier.
 * 3) The intention is to grow this suite as more developers use this feature.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [require.resolve('./tests')],
    services,
    pageObjects: functionalConfig.get('pageObjects'),
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'Analytics Integration Tests',
    },
    esTestCluster: functionalConfig.get('esTestCluster'),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // Disabling telemetry so it doesn't call opt-in before the tests run.
        '--telemetry.enabled=false',
        `--plugin-path=${path.resolve(__dirname, './__fixtures__/plugins/analytics_plugin_a')}`,
        `--plugin-path=${path.resolve(__dirname, './__fixtures__/plugins/analytics_ftr_helpers')}`,
      ],
    },
  };
}
