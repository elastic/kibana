/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const packagePolicyFixture = ({
  agentPolicyId,
  idx,
  space,
}: {
  idx: number;
  agentPolicyId: string;
  space: string;
}) => ({
  'fleet-package-policies': {
    name: `system-test-${idx}`,
    namespace: '',
    description: '',
    package: {
      name: 'system',
      title: 'System',
      version: '1.60.3',
      requires_root: true,
    },
    enabled: true,
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    inputs: [
      {
        type: 'logfile',
        policy_template: 'system',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'system.auth',
            },
            vars: {
              ignore_older: {
                value: '72h',
                type: 'text',
              },
              paths: {
                value: ['/var/log/auth.log*', '/var/log/secure*'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              tags: {
                value: ['system-auth'],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'logfile-system.auth-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              ignore_older: '72h',
              paths: ['/var/log/auth.log*', '/var/log/secure*'],
              exclude_files: [`\.gz$`],
              multiline: {
                pattern: `^\s`,
                match: 'after',
              },
              tags: ['system-auth'],
              processors: [
                {
                  add_locale: null,
                },
                {
                  rename: {
                    fields: [
                      {
                        from: 'message',
                        to: 'event.original',
                      },
                    ],
                    ignore_missing: true,
                    fail_on_error: false,
                  },
                },
                {
                  syslog: {
                    field: 'event.original',
                    ignore_missing: true,
                    ignore_failure: true,
                  },
                },
              ],
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'system.syslog',
            },
            vars: {
              paths: {
                value: ['/var/log/messages*', '/var/log/syslog*', '/var/log/system*'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
              ignore_older: {
                value: '72h',
                type: 'text',
              },
              exclude_files: {
                value: [`\.gz$`],
                type: 'text',
              },
            },
            id: 'logfile-system.syslog-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              paths: ['/var/log/messages*', '/var/log/syslog*', '/var/log/system*'],
              exclude_files: [`\.gz$`],
              multiline: {
                pattern: `^\s`,
                match: 'after',
              },
              processors: [
                {
                  add_locale: null,
                },
              ],
              tags: null,
              ignore_older: '72h',
            },
          },
        ],
      },
      {
        type: 'winlog',
        policy_template: 'system',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'system.application',
            },
            vars: {
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              event_id: {
                type: 'text',
              },
              ignore_older: {
                value: '72h',
                type: 'text',
              },
              language: {
                value: 0,
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
              custom: {
                value: `# Winlog configuration example
#batch_read_size: 100`,
                type: 'yaml',
              },
            },
            id: 'winlog-system.application-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              name: 'Application',
              condition: "${host.platform} == 'windows'",
              ignore_older: '72h',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'system.security',
            },
            vars: {
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              event_id: {
                type: 'text',
              },
              ignore_older: {
                value: '72h',
                type: 'text',
              },
              language: {
                value: 0,
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
              custom: {
                value: `# Winlog configuration example
#batch_read_size: 100`,
                type: 'yaml',
              },
            },
            id: 'winlog-system.security-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              name: 'Security',
              condition: "${host.platform} == 'windows'",
              ignore_older: '72h',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'system.system',
            },
            vars: {
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              event_id: {
                type: 'text',
              },
              ignore_older: {
                value: '72h',
                type: 'text',
              },
              language: {
                value: 0,
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
              custom: {
                value: `# Winlog configuration example
#batch_read_size: 100`,
                type: 'yaml',
              },
            },
            id: 'winlog-system.system-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              name: 'System',
              condition: "${host.platform} == 'windows'",
              ignore_older: '72h',
            },
          },
        ],
      },
      {
        type: 'system/metrics',
        policy_template: 'system',
        enabled: true,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'metrics',
              dataset: 'system.core',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              'core.metrics': {
                value: ['percentages'],
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.core-1f70ab3b-5631-4239-9f87-2881e3986a0a',
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.cpu',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              'cpu.metrics': {
                value: ['percentages', 'normalized_percentages'],
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.cpu-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['cpu'],
              'cpu.metrics': ['percentages', 'normalized_percentages'],
              period: '10s',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.diskio',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              'diskio.include_devices': {
                value: [],
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.diskio-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['diskio'],
              'diskio.include_devices': null,
              period: '10s',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.filesystem',
            },
            vars: {
              period: {
                value: '1m',
                type: 'text',
              },
              'filesystem.ignore_types': {
                value: [],
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                value: `- drop_event.when.regexp:
    system.filesystem.mount_point: ^/(sys|cgroup|proc|dev|etc|host|lib|snap)($|/)`,
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.filesystem-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['filesystem'],
              period: '1m',
              processors: [
                {
                  'drop_event.when.regexp': {
                    'system.filesystem.mount_point':
                      '^/(sys|cgroup|proc|dev|etc|host|lib|snap)($|/)',
                  },
                },
              ],
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.fsstat',
            },
            vars: {
              period: {
                value: '1m',
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                value: `- drop_event.when.regexp:
  system.fsstat.mount_point: ^/(sys|cgroup|proc|dev|etc|host|lib|snap)($|/)`,
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.fsstat-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['fsstat'],
              period: '1m',
              processors: [
                {
                  'drop_event.when.regexp': {
                    'system.fsstat.mount_point': '^/(sys|cgroup|proc|dev|etc|host|lib|snap)($|/)',
                  },
                },
              ],
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.load',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.load-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['load'],
              condition: "${host.platform} != 'windows'",
              period: '10s',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.memory',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.memory-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['memory'],
              period: '10s',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.network',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              'network.interfaces': {
                value: [],
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.network-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['network'],
              period: '10s',
              'network.interfaces': null,
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.process',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              'process.include_top_n.by_cpu': {
                value: 5,
                type: 'integer',
              },
              'process.include_top_n.by_memory': {
                value: 5,
                type: 'integer',
              },
              'process.cmdline.cache.enabled': {
                value: true,
                type: 'bool',
              },
              'process.cgroups.enabled': {
                value: false,
                type: 'bool',
              },
              'process.env.whitelist': {
                value: [],
                type: 'text',
              },
              'process.include_cpu_ticks': {
                value: false,
                type: 'bool',
              },
              processes: {
                value: ['.*'],
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.process-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['process'],
              period: '10s',
              'process.include_top_n.by_cpu': 5,
              'process.include_top_n.by_memory': 5,
              'process.cmdline.cache.enabled': true,
              'process.cgroups.enabled': false,
              'process.include_cpu_ticks': false,
              processes: ['.*'],
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.process.summary',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.process.summary-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['process_summary'],
              period: '10s',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.socket_summary',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.socket_summary-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['socket_summary'],
              period: '10s',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'metrics',
              dataset: 'system.uptime',
            },
            vars: {
              period: {
                value: '10s',
                type: 'text',
              },
              tags: {
                value: [],
                type: 'text',
              },
              processors: {
                type: 'yaml',
              },
            },
            id: 'system/metrics-system.uptime-1f70ab3b-5631-4239-9f87-2881e3986a0a',
            compiled_stream: {
              metricsets: ['uptime'],
              period: '10s',
            },
          },
        ],
        vars: {
          'system.hostfs': {
            type: 'text',
          },
        },
      },
      {
        type: 'httpjson',
        policy_template: 'system',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'system.application',
            },
            vars: {
              interval: {
                value: '10s',
                type: 'text',
              },
              search: {
                value: 'search sourcetype="XmlWinEventLog:Application"',
                type: 'text',
              },
              tags: {
                value: ['forwarded'],
                type: 'text',
              },
            },
            id: 'httpjson-system.application-1f70ab3b-5631-4239-9f87-2881e3986a0a',
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'system.security',
            },
            vars: {
              interval: {
                value: '10s',
                type: 'text',
              },
              search: {
                value: 'search sourcetype="XmlWinEventLog:Security"',
                type: 'text',
              },
              tags: {
                value: ['forwarded'],
                type: 'text',
              },
            },
            id: 'httpjson-system.security-1f70ab3b-5631-4239-9f87-2881e3986a0a',
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'system.system',
            },
            vars: {
              interval: {
                value: '10s',
                type: 'text',
              },
              search: {
                value: 'search sourcetype="XmlWinEventLog:System"',
                type: 'text',
              },
              tags: {
                value: ['forwarded'],
                type: 'text',
              },
            },
            id: 'httpjson-system.system-1f70ab3b-5631-4239-9f87-2881e3986a0a',
          },
        ],
        vars: {
          url: {
            value: 'https://server.example.com:8089',
            type: 'text',
          },
          enable_request_tracer: {
            type: 'bool',
          },
          username: {
            type: 'text',
          },
          password: {
            type: 'password',
          },
          token: {
            type: 'password',
          },
          preserve_original_event: {
            value: false,
            type: 'bool',
          },
          ssl: {
            value: `#certificate_authorities:
#  - |
#    -----BEGIN CERTIFICATE-----
#    MIIDCjCCAfKgAwIBAgITJ706Mu2wJlKckpIvkWxEHvEyijANBgkqhkiG9w0BAQsF
#    ADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcNMTkwNzIyMTkyOTA0WhgPMjExOTA2
#    MjgxOTI5MDRaMBQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEB
#    BQADggEPADCCAQoCggEBANce58Y/JykI58iyOXpxGfw0/gMvF0hUQAcUrSMxEO6n
#    fZRA49b4OV4SwWmA3395uL2eB2NB8y8qdQ9muXUdPBWE4l9rMZ6gmfu90N5B5uEl
#    94NcfBfYOKi1fJQ9i7WKhTjlRkMCgBkWPkUokvBZFRt8RtF7zI77BSEorHGQCk9t
#    /D7BS0GJyfVEhftbWcFEAG3VRcoMhF7kUzYwp+qESoriFRYLeDWv68ZOvG7eoWnP
#    PsvZStEVEimjvK5NSESEQa9xWyJOmlOKXhkdymtcUd/nXnx6UTCFgnkgzSdTWV41
#    CI6B6aJ9svCTI2QuoIq2HxX/ix7OvW1huVmcyHVxyUECAwEAAaNTMFEwHQYDVR0O
#    BBYEFPwN1OceFGm9v6ux8G+DZ3TUDYxqMB8GA1UdIwQYMBaAFPwN1OceFGm9v6ux
#    8G+DZ3TUDYxqMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAG5D
#    874A4YI7YUwOVsVAdbWtgp1d0zKcPRR+r2OdSbTAV5/gcS3jgBJ3i1BN34JuDVFw
#    3DeJSYT3nxy2Y56lLnxDeF8CUTUtVQx3CuGkRg1ouGAHpO/6OqOhwLLorEmxi7tA
#    H2O8mtT0poX5AnOAhzVy7QW0D/k4WaoLyckM5hUa6RtvgvLxOwA0U+VGurCDoctu
#    8F4QOgTAWyh8EZIwaKCliFRSynDpv3JTUwtfZkxo6K6nce1RhCWFAsMvDZL8Dgc0
#    yvgJ38BRsFOtkRuAGSf6ZUwTO8JJRRIFnpUzXflAnGivK9M13D5GEQMmIl6U9Pvk
#    sxSmbIUfc2SGJGCJD4I=
#    -----END CERTIFICATE-----
`,
            type: 'yaml',
          },
        },
      },
    ],
    output_id: null,
    revision: 1,
    created_at: '2024-08-30T13:45:51.197Z',
    created_by: 'system',
    updated_at: '2024-08-30T13:45:51.197Z',
    updated_by: 'system',
  },
  namespaces: [space],
  type: 'fleet-package-policies',
  references: [],
  managed: false,
  coreMigrationVersion: '8.8.0',
  typeMigrationVersion: '10.1.0',
  updated_at: '2024-08-30T13:45:51.197Z',
  created_at: '2024-08-30T13:45:51.197Z',
});
