/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { join } from 'path';

import type { FtrConfigProviderContext } from '@kbn/test';
import { getDataPath } from '@kbn/utils';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const withoutSecurityConfig = await readConfigFile(
    require.resolve('./manual_configuration_without_security.config')
  );

  const tempKibanaYamlFile = join(getDataPath(), `interactive_setup_kibana_${Date.now()}.yml`);
  await fs.writeFile(tempKibanaYamlFile, '');

  return {
    ...withoutSecurityConfig.getAll(),

    testFiles: [require.resolve('./tests/manual_configuration_without_tls')],

    junit: {
      reportName: 'Interactive Setup Functional Tests (Manual configuration without TLS)',
    },

    esTestCluster: {
      ...withoutSecurityConfig.get('esTestCluster'),
      serverArgs: [
        ...withoutSecurityConfig
          .get('esTestCluster.serverArgs')
          .filter((arg: string) => !arg.startsWith('xpack.security.')),
        'xpack.security.enabled=true',
      ],
    },

    kbnTestServer: {
      ...withoutSecurityConfig.get('kbnTestServer'),
      serverArgs: [
        ...withoutSecurityConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.startsWith('--config')),
        `--config=${tempKibanaYamlFile}`,
      ],
    },
  };
}
