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

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const httpConfig = await readConfigFile(require.resolve('../../config'));

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(path.resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(path.resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    testFiles: [
      // Status test should be first to resolve manually created "unavailable" plugin
      require.resolve('./status'),
      require.resolve('./cache'),
      require.resolve('./headers'),
    ],
    services: httpConfig.get('services'),
    servers: httpConfig.get('servers'),
    junit: {
      reportName: 'Kibana Platform Http Integration Tests',
    },
    esTestCluster: httpConfig.get('esTestCluster'),
    kbnTestServer: {
      ...httpConfig.get('kbnTestServer'),
      serverArgs: [
        ...httpConfig.get('kbnTestServer.serverArgs'),
        ...plugins.map(
          (pluginDir) => `--plugin-path=${path.resolve(__dirname, 'plugins', pluginDir)}`
        ),
      ],
      runOptions: {
        ...(httpConfig.get('kbnTestServer.runOptions') ?? {}),
        // Don't wait for Kibana to be completely ready so that we can test the status timeouts
        wait: /\[Kibana\]\[http\] http server running/,
      },
    },
  };
}
