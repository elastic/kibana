/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { join, resolve } from 'path';

import type { FtrConfigProviderContext } from '@kbn/test';
import { getDataPath } from '@kbn/utils';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const manualConfigurationFlowTestsConfig = await readConfigFile(
    require.resolve('./manual_configuration_flow.config.ts')
  );

  const tempKibanaYamlFile = join(getDataPath(), `interactive_setup_kibana_${Date.now()}.yml`);
  await fs.writeFile(tempKibanaYamlFile, '');

  const caPath = resolve(__dirname, './fixtures/elasticsearch.p12');

  return {
    ...manualConfigurationFlowTestsConfig.getAll(),

    testFiles: [require.resolve('./tests/enrollment_flow')],

    junit: {
      reportName: 'Interactive Setup API Integration Tests (Enrollment flow)',
    },

    esTestCluster: {
      ...manualConfigurationFlowTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...manualConfigurationFlowTestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enrollment.enabled=true',
        `xpack.security.http.ssl.keystore.path=${caPath}`,
        'xpack.security.http.ssl.keystore.password=storepass',
      ],
    },

    kbnTestServer: {
      ...manualConfigurationFlowTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...manualConfigurationFlowTestsConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.startsWith('--config')),
        `--config=${tempKibanaYamlFile}`,
      ],
    },
  };
}
