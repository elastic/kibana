/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
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
  const httpConfig = await readConfigFile(require.resolve('../../config'));

  // Find all folders in __fixtures__/plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(path.resolve(__dirname, '../../__fixtures__/plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(path.resolve(__dirname, '../../__fixtures__/plugins', file)).isDirectory()
  );

  return {
    testFiles: [
      // Status test should be first to resolve manually created "unavailable" plugin
      require.resolve('./status'),
    ],
    services: httpConfig.get('services'),
    servers: httpConfig.get('servers'),
    junit: {
      reportName: 'Kibana Platform Status Integration Tests',
    },
    esTestCluster: httpConfig.get('esTestCluster'),
    kbnTestServer: {
      ...httpConfig.get('kbnTestServer'),
      serverArgs: [
        ...httpConfig.get('kbnTestServer.serverArgs'),
        ...plugins.map(
          (pluginDir) =>
            `--plugin-path=${path.resolve(__dirname, '../../__fixtures__/plugins', pluginDir)}`
        ),
      ],
      runOptions: {
        ...httpConfig.get('kbnTestServer.runOptions'),
        // Don't wait for Kibana to be completely ready so that we can test the status timeouts
        wait: /\[Kibana\]\[http\] http server running/,
      },
    },
  };
}
