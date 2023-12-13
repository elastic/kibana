/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { FtrConfigProviderContext, findTestPluginPaths } from '@kbn/test';
import { resolve } from 'path';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../functional/config.base.js'));

  return {
    ...functionalConfig.getAll(),

    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },

    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // Required for Cypress environment
        '--csp.warnLegacyBrowsers=false',
        '--csp.strict=false',
        '--env.name=development',
        '--telemetry.optIn=false',
        ...findTestPluginPaths(resolve(REPO_ROOT, 'examples')),
      ],
    },
  };
}
