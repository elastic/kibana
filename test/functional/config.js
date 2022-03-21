/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pageObjects } from './page_objects';
import { services } from './services';

export default async function ({ readConfigFile }) {
  const commonConfig = await readConfigFile(require.resolve('../common/config'));

  return {
    testFiles: [
      require.resolve('./apps/status_page'),
      require.resolve('./apps/bundles'),
      require.resolve('./apps/console'),
      require.resolve('./apps/context'),
      require.resolve('./apps/dashboard'),
      require.resolve('./apps/dashboard_elements'),
      require.resolve('./apps/discover'),
      require.resolve('./apps/getting_started'),
      require.resolve('./apps/home'),
      require.resolve('./apps/management'),
      require.resolve('./apps/saved_objects_management'),
      require.resolve('./apps/visualize'),
    ],
    pageObjects,
    services,

    servers: commonConfig.get('servers'),

    esTestCluster: {
      ...commonConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },

    kbnTestServer: {
      ...commonConfig.get('kbnTestServer'),
      serverArgs: [
        ...commonConfig.get('kbnTestServer.serverArgs'),
        '--telemetry.optIn=false',
        '--savedObjects.maxImportPayloadBytes=10485760',

        // to be re-enabled once kibana/issues/102552 is completed
        '--xpack.reporting.enabled=false',
      ],
    },

    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
        'visualization:visualize:legacyPieChartsLibrary': true,
        'visualization:useLegacyTimeAxis': true,
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
      /** @obsolete "management" should be instead of "settings" **/
      settings: {
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
      observabilityCases: {
        pathname: '/app/observability/cases',
      },
      fleet: {
        pathname: '/app/fleet',
      },
      integrations: {
        pathname: '/app/integrations',
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
        test_shakespeare_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['shakes*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        test_testhuge_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['testhuge*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        test_alias_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['alias*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        test_field_formatters: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['field_formats_management_functional_tests*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        //for sample data - can remove but not add sample data.( not ml)- for ml use built in role.
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

        version_test: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['version-test'],
                privileges: ['read', 'view_index_metadata', 'manage', 'create_index', 'index'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        context_encoded_param: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['context-encoded-param'],
                privileges: ['read', 'view_index_metadata', 'manage', 'create_index', 'index'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_sample_read: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['kibana_sample*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nanos: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date-nanos'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nanos_custom: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date_nanos_custom_timestamp'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nanos_mixed: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date_nanos_mixed', 'timestamp-*'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_date_nested: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['date-nested'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },
        kibana_message_with_newline: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['newline-test'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_timefield: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['without-timefield', 'with-timefield'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        kibana_large_strings: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['testlargestring'],
                privileges: ['read', 'view_index_metadata'],
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

        'test-index-unmapped-fields': {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['test-index-unmapped-fields'],
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
                names: ['animals-*', 'dogbreeds'],
                privileges: ['read', 'view_index_metadata'],
                field_security: { grant: ['*'], except: [] },
              },
            ],
            run_as: [],
          },
          kibana: [],
        },

        test_alias1_reader: {
          elasticsearch: {
            cluster: [],
            indices: [
              {
                names: ['alias1'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        },
      },
      defaultRoles: ['test_logstash_reader', 'kibana_admin'],
    },
  };
}
