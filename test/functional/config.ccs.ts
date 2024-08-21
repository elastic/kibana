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
  const baseConfig = await readConfigFile(require.resolve('./config.base.js'));

  return {
    ...baseConfig.getAll(),

    testFiles: [
      require.resolve('./apps/dashboard/group3'),
      require.resolve('./apps/discover/ccs_compatibility'),
      require.resolve('./apps/console/monaco/_console_ccs'),
      require.resolve('./apps/management/ccs_compatibility'),
      require.resolve('./apps/getting_started'),
    ],

    services: {
      ...baseConfig.get('services'),
      remoteEs: RemoteEsProvider,
      remoteEsArchiver: RemoteEsArchiverProvider,
    },

    junit: {
      reportName: 'Kibana CCS Tests',
    },

    security: {
      ...baseConfig.get('security'),
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
      defaultRoles: [...(baseConfig.get('security.defaultRoles') ?? []), 'ccs_remote_search'],
    },

    esTestCluster: {
      ...baseConfig.get('esTestCluster'),
      ccs: {
        remoteClusterUrl:
          process.env.REMOTE_CLUSTER_URL ??
          `http://elastic:changeme@localhost:${baseConfig.get('servers.elasticsearch.port') + 1}`,
      },
    },
  };
}
