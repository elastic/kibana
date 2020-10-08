/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { pageObjects } from '../functional/page_objects';
import { services } from '../functional/services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    testFiles: [require.resolve('./dashboard_embedding')],
    pageObjects,
    services,
    servers: commonConfig.get('servers'),

    esTestCluster: commonConfig.get('esTestCluster'),

    kbnTestServer: {
      ...commonConfig.get('kbnTestServer'),
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),
        '--oss',
        '--telemetry.optIn=false',
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
        //for sample data - can remove but not add sample data
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
