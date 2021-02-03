/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    testFiles: [require.resolve('./index.ts')],
    pageObjects: commonConfig.get('pageObjects'),
    services: commonConfig.get('services'),
    servers: commonConfig.get('servers'),
    esTestCluster: commonConfig.get('esTestCluster'),

    kbnTestServer: {
      ...commonConfig.get('kbnTestServer'),
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),
        '--oss',
        '--telemetry.optIn=false',
        '--dashboard.allowByValueEmbeddables=true',
      ],
    },

    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },

    apps: {
      kibana: {
        pathname: '/app/kibana',
      },
      status_page: {
        pathname: '/status',
      },
      discover: {
        pathname: '/app/discover',
        hash: '/',
      },
      context: {
        pathname: '/app/discover',
        hash: '/context',
      },
      visualize: {
        pathname: '/app/visualize',
        hash: '/',
      },
      dashboard: {
        pathname: '/app/dashboards',
        hash: '/list',
      },
      management: {
        pathname: '/app/management',
      },
      console: {
        pathname: '/app/dev_tools',
        hash: '/console',
      },
      home: {
        pathname: '/app/home',
        hash: '/',
      },
    },
    junit: {
      reportName: 'Chrome UI Functional Tests',
    },
    browser: {
      type: 'chrome',
    },

    security: {
      roles: {
        test_logstash_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['logstash*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        // for sample data - can remove but not add sample data
        kibana_sample_admin: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['kibana_sample*'],
                privileges: ['read', 'view_index_metadata', 'manage', 'create_index', 'index'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        long_window_logstash: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['long-window-logstash-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        animals: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['animals-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
      },
      defaultRoles: ['kibana_admin'],
    },
  };
}
