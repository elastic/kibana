/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUD_KIBANA_CONFIG_WITHOUT_APM = {
  xpack: {
    fleet: {
      internal: {
        registry: {
          kibanaVersionCheckEnabled: false,
        },
      },
      packages: [
        {
          name: 'fleet_server',
          version: 'latest',
        },
        {
          name: 'system',
          version: 'latest',
        },
      ],
      outputs: [
        {
          name: 'Elastic Cloud internal output',
          type: 'elasticsearch',
          id: 'es-containerhost',
          hosts: ['https://cloudinternales:9200'],
        },
      ],
      agentPolicies: [
        {
          name: 'Elastic Cloud agent policy',
          description: 'Default agent policy for agents hosted on Elastic Cloud',
          id: 'policy-elastic-agent-on-cloud',
          data_output_id: 'es-containerhost',
          monitoring_output_id: 'es-containerhost',
          is_default: false,
          is_managed: true,
          is_default_fleet_server: false,
          namespace: 'default',
          monitoring_enabled: [],
          unenroll_timeout: 86400,
          package_policies: [
            {
              name: 'Fleet Server',
              id: 'elastic-cloud-fleet-server',
              package: {
                name: 'fleet_server',
              },
              inputs: [
                {
                  type: 'fleet-server',
                  keep_enabled: true,
                  vars: [
                    {
                      name: 'host',
                      value: '0.0.0.0',
                      frozen: true,
                    },
                    {
                      name: 'port',
                      value: 8220,
                      frozen: true,
                    },
                    {
                      name: 'custom',
                      value:
                        'server.runtime:\n  gc_percent: 20          # Force the GC to execute more frequently: see https://golang.org/pkg/runtime/debug/#SetGCPercent\n',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'Default policy',
          id: 'default-policy',
          description: 'Default agent policy created by Kibana',
          is_default: true,
          is_managed: false,
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          package_policies: [
            {
              name: 'system-1',
              id: 'default-system',
              package: {
                name: 'system',
              },
            },
          ],
        },
      ],
    },
  },
};
