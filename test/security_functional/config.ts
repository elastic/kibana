/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import path from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [require.resolve('./index.ts')],
    services: functionalConfig.get('services'),
    pageObjects: functionalConfig.get('pageObjects'),
    servers: functionalConfig.get('servers'),
    esTestCluster: functionalConfig.get('esTestCluster'),
    apps: {},
    esArchiver: {
      directory: path.resolve(__dirname, '../functional/fixtures/es_archiver'),
    },
    snapshots: {
      directory: path.resolve(__dirname, 'snapshots'),
    },
    junit: {
      reportName: 'Security OSS Functional Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.startsWith('--security.showInsecureClusterWarning')),
        '--security.showInsecureClusterWarning=true',
        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',
      ],
    },
  };
}
