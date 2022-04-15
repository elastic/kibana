/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { RemoteEsArchiverProvider } from './services/remote_es/remote_es_archiver';
import { RemoteEsProvider } from './services/remote_es/remote_es';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [require.resolve('./apps/dashboard'), require.resolve('./apps/discover')],

    services: {
      ...functionalConfig.get('services'),
      remoteEs: RemoteEsProvider,
      remoteEsArchiver: RemoteEsArchiverProvider,
    },

    junit: {
      reportName: 'Kibana CCS Tests',
    },

    security: {
      ...functionalConfig.get('security'),
      remoteEsRoles: {
        ccs_remote_search: {
          indices: [
            {
              names: ['*'],
              privileges: ['read', 'view_index_metadata', 'read_cross_cluster'],
            },
          ],
        },
      },
      defaultRoles: [...(functionalConfig.get('security.defaultRoles') ?? []), 'ccs_remote_search'],
    },

    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      ccs: {
        remoteClusterUrl:
          process.env.REMOTE_CLUSTER_URL ??
          `http://elastic:changeme@localhost:${
            functionalConfig.get('servers.elasticsearch.port') + 1
          }`,
      },
    },
  };
}
