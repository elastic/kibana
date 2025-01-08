/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createKibanaSupertestProvider,
  KibanaSupertestWithoutAuthProvider,
  ElasticsearchSupertestProvider,
} from './services';

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    services: {
      ...commonFunctionalServices,
      supertest: createKibanaSupertestProvider(),
      supertestWithoutAuth: KibanaSupertestWithoutAuthProvider,
      esSupertest: ElasticsearchSupertestProvider,
    },
    servers: commonConfig.get('servers'),
    junit: {
      reportName: 'Integration Tests',
    },
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        '--elasticsearch.healthCheck.delay=3600000',
        '--server.xsrf.disableProtection=true',
      ],
    },
  };
}
