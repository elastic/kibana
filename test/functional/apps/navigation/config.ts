/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--navigation.solutionNavigation.featureOn=true',
        '--navigation.solutionNavigation.enabled=true',
        '--navigation.solutionNavigation.optInStatus=visible',
        '--navigation.solutionNavigation.defaultSolution=es',
        // Note: the base64 string in the cloud.id config contains the ES endpoint required in the functional tests
        '--xpack.cloud.id=ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM=',
        '--xpack.cloud.base_url=https://cloud.elastic.co',
        '--xpack.cloud.deployment_url=/deployments/deploymentId',
        '--xpack.cloud.organization_url=/organization/organizationId',
        '--xpack.cloud.billing_url=/billing',
        '--xpack.cloud.profile_url=/user/userId',
      ],
    },
  };
}
