/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: real package info served by the local package registry for the integration group
// prototype (elastic/integrations branch nginx-root-prototype), trimmed (no readme/assets, long
// var descriptions cut). The registry JSON drops fields Kibana reads from the archive (composable
// input `name`s, input package template vars, select var `options`), so those are taken from the
// built zip, like Kibana's archive parsing does.

import type { PackageInfo } from '../../../../../../../../types';

export const nginxPackageInfo = {
  name: 'nginx',
  title: 'Nginx',
  version: '3.2.2',
  release: 'ga',
  description:
    'Collect access logs, error logs, and stub_status metrics from Nginx via Elastic Agent.',
  type: 'integration',
  policy_templates: [
    {
      name: 'nginx',
      title: 'Nginx logs and metrics',
      description: 'Collect logs and metrics from Nginx instances',
      inputs: [
        {
          type: 'logfile',
          vars: [
            {
              name: 'condition',
              type: 'text',
              title: 'Condition',
              description:
                'Condition to filter when to collect this input. See [Dynamic Input Configuration](https://www.elastic.co/guide/en/fle...',
              multi: false,
              required: false,
              show_user: false,
            },
          ],
          title: 'Collect logs from Nginx instances',
          description: 'Collecting Nginx access and error logs',
        },
        {
          type: 'nginx/metrics',
          vars: [
            {
              name: 'hosts',
              type: 'text',
              title: 'Hosts',
              multi: true,
              required: true,
              show_user: true,
              default: ['http://127.0.0.1:80'],
            },
            {
              name: 'condition',
              type: 'text',
              title: 'Condition',
              description:
                'Condition to filter when to collect this input. See [Dynamic Input Configuration](https://www.elastic.co/guide/en/fle...',
              multi: false,
              required: false,
              show_user: false,
            },
          ],
          title: 'Collect metrics from Nginx instances',
          description: 'Collecting Nginx stub status metrics',
        },
      ],
      multiple: true,
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'nginx.access',
      title: 'Nginx access logs',
      release: 'ga',
      streams: [
        {
          input: 'logfile',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: true,
              required: true,
              show_user: true,
              default: ['/var/log/nginx/access.log*'],
            },
            {
              name: 'tags',
              type: 'text',
              title: 'Tags',
              multi: true,
              required: true,
              show_user: false,
              default: ['nginx-access'],
            },
            {
              name: 'preserve_original_event',
              required: true,
              show_user: true,
              title: 'Preserve original event',
              description:
                'Preserves a raw copy of the original event, added to the field `event.original`',
              type: 'bool',
              multi: false,
              default: false,
            },
            {
              name: 'processors',
              type: 'yaml',
              title: 'Processors',
              multi: false,
              required: false,
              show_user: false,
              description:
                'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata. This ...',
            },
            {
              name: 'ignore_older',
              type: 'text',
              title: 'Ignore events older than',
              default: '72h',
              required: false,
              show_user: false,
              description:
                'If this option is specified, events that are older than the specified amount of time are ignored. Valid time units ar...',
            },
          ],
          title: 'Nginx access logs',
          description: 'Collect Nginx access logs',
          enabled: true,
          ingestion_method: 'File',
        },
      ],
      package: 'nginx',
      path: 'access',
    },
    {
      type: 'logs',
      dataset: 'nginx.error',
      title: 'Nginx error logs',
      release: 'ga',
      streams: [
        {
          input: 'logfile',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: true,
              required: true,
              show_user: true,
              default: ['/var/log/nginx/error.log*'],
            },
            {
              name: 'tags',
              type: 'text',
              title: 'Tags',
              multi: true,
              required: true,
              show_user: false,
              default: ['nginx-error'],
            },
            {
              name: 'preserve_original_event',
              required: true,
              show_user: true,
              title: 'Preserve original event',
              description:
                'Preserves a raw copy of the original event, added to the field `event.original`',
              type: 'bool',
              multi: false,
              default: false,
            },
            {
              name: 'processors',
              type: 'yaml',
              title: 'Processors',
              multi: false,
              required: false,
              show_user: false,
              description:
                'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata. This ...',
            },
            {
              name: 'ignore_older',
              type: 'text',
              title: 'Ignore events older than',
              default: '72h',
              required: false,
              show_user: false,
              description:
                'If this option is specified, events that are older than the specified amount of time are ignored. Valid time units ar...',
            },
          ],
          title: 'Nginx error logs',
          description: 'Collect Nginx error logs',
          enabled: true,
          ingestion_method: 'File',
        },
      ],
      package: 'nginx',
      path: 'error',
    },
    {
      type: 'metrics',
      dataset: 'nginx.stubstatus',
      title: 'Nginx stubstatus metrics',
      release: 'ga',
      streams: [
        {
          input: 'nginx/metrics',
          vars: [
            {
              name: 'period',
              type: 'text',
              title: 'Period',
              multi: false,
              required: true,
              show_user: true,
              default: '10s',
            },
            {
              name: 'server_status_path',
              type: 'text',
              title: 'Server Status Path',
              multi: false,
              required: true,
              show_user: false,
              default: '/nginx_status',
            },
            {
              name: 'tags',
              type: 'text',
              title: 'Tags',
              multi: true,
              required: false,
              show_user: false,
              default: ['nginx-stubstatus'],
            },
            {
              name: 'processors',
              type: 'yaml',
              title: 'Processors',
              multi: false,
              required: false,
              show_user: false,
              description:
                'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata. This ...',
            },
          ],
          title: 'Nginx stub status metrics',
          description: 'Collect Nginx stub status metrics',
          enabled: true,
          ingestion_method: 'API',
        },
      ],
      package: 'nginx',
      path: 'stubstatus',
    },
  ],
} as unknown as PackageInfo;

export const nginxOtelPackageInfo = {
  name: 'nginx_otel_integration',
  title: 'Nginx (OpenTelemetry)',
  version: '0.1.0',
  release: 'beta',
  description:
    'Collect metrics and logs from Nginx using the OTel nginxreceiver and filelogreceiver. Covers stub_status metrics plus access and error logs.',
  type: 'integration',
  requires: {
    input: [
      {
        package: 'nginx_otel_input',
        version: '0.2.2',
      },
      {
        package: 'filelog_otel',
        version: '0.2.0',
      },
    ],
    content: [
      {
        package: 'nginx_otel',
        version: '0.7.0',
      },
    ],
  },
  policy_templates: [
    {
      name: 'nginx',
      title: 'Nginx logs and metrics',
      description:
        'Collect stub_status metrics and access/error logs from Nginx using OpenTelemetry receivers',
      data_streams: ['metrics', 'access', 'error'],
      inputs: [
        {
          type: 'otelcol',
          title: 'Nginx Metrics',
          description: 'Scrape Nginx stub_status metrics using the OTel Collector nginxreceiver',
          name: 'nginx_otel_input',
        },
        {
          type: 'otelcol',
          title: 'Nginx Logs',
          description: 'Tail Nginx access and error logs using the OTel Collector filelogreceiver',
          name: 'filelog_otel',
        },
      ],
      multiple: true,
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'nginx.access',
      title: 'Nginx Access Logs',
      release: 'beta',
      streams: [
        {
          input: 'filelog_otel',
          vars: [
            {
              name: 'include',
              required: true,
              title: 'Access log paths',
              description: 'File glob patterns that match Nginx access log files.',
              type: 'text',
              multi: true,
              default: ['/var/log/nginx/access.log'],
              show_user: true,
            },
            {
              name: 'exclude',
              required: false,
              title: 'Exclude patterns.',
              description:
                'A list of file glob patterns to exclude from reading. This is applied against the paths matched by include.',
              type: 'text',
              multi: true,
              show_user: false,
            },
            {
              name: 'start_at',
              required: false,
              title: 'Start at',
              type: 'select',
              multi: false,
              default: 'end',
              options: [
                {
                  text: 'Beginning of files.',
                  value: 'beginning',
                },
                {
                  text: 'End of files.',
                  value: 'end',
                },
              ],
              description: 'At startup, where to start reading logs from the file.',
              show_user: true,
            },
            {
              name: 'exclude_older_than',
              required: false,
              show_user: false,
              title: 'Exclude files older than this duration.',
              description:
                'Exclude files whose modification time is older than the specified duration (e.g., 48h).',
              type: 'duration',
            },
            {
              name: 'max_concurrent_files',
              required: false,
              show_user: false,
              title: 'Maximum number of files to read concurrently.',
              description:
                'The maximum number of log files from which logs will be read concurrently.',
              type: 'integer',
              default: 1024,
            },
            {
              name: 'max_batches',
              required: false,
              show_user: false,
              title: 'Maximum batches per poll interval.',
              description:
                'The maximum number of batches processed during a single poll interval. Set to 0 for unlimited.',
              type: 'integer',
              default: 0,
            },
            {
              name: 'include_file_name',
              required: false,
              show_user: false,
              title: 'Whether to add the file name as the attribute log.file.name.',
              type: 'bool',
              default: true,
            },
            {
              name: 'include_file_path',
              required: false,
              show_user: false,
              title: 'Include file path',
              type: 'bool',
              default: true,
              description: 'Add the file path as the attribute log.file.path.',
            },
            {
              name: 'include_file_name_resolved',
              required: false,
              show_user: false,
              title:
                'Whether to add the file name after symlink resolution as the attribute log.file.name_resolved.',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_path_resolved',
              required: false,
              show_user: false,
              title:
                'Whether to add the file path after symlink resolution as the attribute log.file.path_resolved.',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_owner_name',
              required: false,
              show_user: false,
              title:
                'Whether to add the file owner name as the attribute log.file.owner.name (Unix only).',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_owner_group_name',
              required: false,
              show_user: false,
              title:
                'Whether to add the file owner group name as the attribute log.file.owner.group.name (Unix only).',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_record_number',
              required: false,
              show_user: false,
              title:
                'Whether to add the record number in the file as the attribute log.file.record_number.',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_record_offset',
              required: false,
              show_user: false,
              title:
                'Whether to add the record offset in the file as the attribute log.file.record_offset.',
              type: 'bool',
              default: false,
            },
            {
              name: 'encoding',
              required: false,
              show_user: false,
              title: 'The encoding of the file being read.',
              description: 'The character encoding of the files being read.',
              type: 'select',
              multi: false,
              default: 'utf-8',
              options: [
                {
                  text: 'No encoding validation (raw bytes)',
                  value: 'nop',
                },
                {
                  text: 'UTF-8',
                  value: 'utf-8',
                },
                {
                  text: 'UTF-8 (without replacing invalid bytes)',
                  value: 'utf-8-raw',
                },
                {
                  text: 'UTF-16 Little Endian',
                  value: 'utf-16le',
                },
                {
                  text: 'UTF-16 Big Endian',
                  value: 'utf-16be',
                },
                {
                  text: 'ASCII',
                  value: 'ascii',
                },
                {
                  text: 'Big5 (Chinese character encoding)',
                  value: 'big5',
                },
              ],
            },
            {
              name: 'preserve_leading_whitespaces',
              required: false,
              show_user: false,
              title: 'Whether to preserve leading whitespaces in log entries.',
              type: 'bool',
              default: false,
            },
            {
              name: 'preserve_trailing_whitespaces',
              required: false,
              show_user: false,
              title: 'Whether to preserve trailing whitespaces in log entries.',
              type: 'bool',
              default: false,
            },
            {
              name: 'fingerprint_size',
              required: false,
              show_user: false,
              title: 'The number of bytes to use for file fingerprint.',
              description:
                'The number of bytes with which to identify a file. The first N bytes will be used to identify the file.',
              type: 'text',
              default: '1kb',
            },
            {
              name: 'initial_buffer_size',
              required: false,
              show_user: false,
              title: 'Initial buffer size for reading log entries.',
              description: 'The initial size of the buffer used to read log entries.',
              type: 'text',
              default: '16KiB',
            },
            {
              name: 'max_log_size',
              required: false,
              show_user: false,
              title: 'Maximum size of a log entry.',
              description:
                'The maximum size of a log entry to read before failing. Protects against malformed files.',
              type: 'text',
              default: '1MiB',
            },
            {
              name: 'poll_interval',
              required: false,
              show_user: false,
              title: 'The duration between filesystem polls.',
              type: 'duration',
              default: '200ms',
            },
            {
              name: 'force_flush_period',
              required: false,
              show_user: false,
              title: 'Time after which a partial log entry will be forcefully flushed.',
              description:
                'Time since last data was found in the file, after which currently buffered log will be emitted.',
              type: 'duration',
              default: '500ms',
            },
            {
              name: 'multiline_line_start_pattern',
              required: false,
              show_user: false,
              title: 'Multiline line start pattern.',
              description:
                'A regular expression that matches the beginning of a new log entry. Only one of line start pattern or line end patter...',
              type: 'text',
            },
            {
              name: 'multiline_line_end_pattern',
              required: false,
              show_user: false,
              title: 'Multiline line end pattern.',
              description:
                'A regular expression that matches the end of a log entry. Only one of line start pattern or line end pattern can be set.',
              type: 'text',
            },
            {
              name: 'multiline_omit_pattern',
              required: false,
              show_user: false,
              title: 'Omit the matching pattern from the log entry.',
              description:
                'If true, the matching line start/end pattern will not be included in the resulting log entry.',
              type: 'bool',
              default: false,
            },
          ],
          title: 'Nginx Access Logs',
          description: 'Tail Nginx access logs using the OTel Collector filelogreceiver.',
          enabled: true,
        },
      ],
      package: 'nginx_otel_integration',
      path: 'access',
    },
    {
      type: 'logs',
      dataset: 'nginx.error',
      title: 'Nginx Error Logs',
      release: 'beta',
      streams: [
        {
          input: 'filelog_otel',
          vars: [
            {
              name: 'include',
              required: true,
              title: 'Error log paths',
              description: 'File glob patterns that match Nginx error log files.',
              type: 'text',
              multi: true,
              default: ['/var/log/nginx/error.log'],
              show_user: true,
            },
            {
              name: 'exclude',
              required: false,
              title: 'Exclude patterns.',
              description:
                'A list of file glob patterns to exclude from reading. This is applied against the paths matched by include.',
              type: 'text',
              multi: true,
              show_user: false,
            },
            {
              name: 'start_at',
              required: false,
              title: 'Start at',
              type: 'select',
              multi: false,
              default: 'end',
              options: [
                {
                  text: 'Beginning of files.',
                  value: 'beginning',
                },
                {
                  text: 'End of files.',
                  value: 'end',
                },
              ],
              description: 'At startup, where to start reading logs from the file.',
              show_user: true,
            },
            {
              name: 'exclude_older_than',
              required: false,
              show_user: false,
              title: 'Exclude files older than this duration.',
              description:
                'Exclude files whose modification time is older than the specified duration (e.g., 48h).',
              type: 'duration',
            },
            {
              name: 'max_concurrent_files',
              required: false,
              show_user: false,
              title: 'Maximum number of files to read concurrently.',
              description:
                'The maximum number of log files from which logs will be read concurrently.',
              type: 'integer',
              default: 1024,
            },
            {
              name: 'max_batches',
              required: false,
              show_user: false,
              title: 'Maximum batches per poll interval.',
              description:
                'The maximum number of batches processed during a single poll interval. Set to 0 for unlimited.',
              type: 'integer',
              default: 0,
            },
            {
              name: 'include_file_name',
              required: false,
              show_user: false,
              title: 'Whether to add the file name as the attribute log.file.name.',
              type: 'bool',
              default: true,
            },
            {
              name: 'include_file_path',
              required: false,
              show_user: false,
              title: 'Include file path',
              type: 'bool',
              default: true,
              description: 'Add the file path as the attribute log.file.path.',
            },
            {
              name: 'include_file_name_resolved',
              required: false,
              show_user: false,
              title:
                'Whether to add the file name after symlink resolution as the attribute log.file.name_resolved.',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_path_resolved',
              required: false,
              show_user: false,
              title:
                'Whether to add the file path after symlink resolution as the attribute log.file.path_resolved.',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_owner_name',
              required: false,
              show_user: false,
              title:
                'Whether to add the file owner name as the attribute log.file.owner.name (Unix only).',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_owner_group_name',
              required: false,
              show_user: false,
              title:
                'Whether to add the file owner group name as the attribute log.file.owner.group.name (Unix only).',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_record_number',
              required: false,
              show_user: false,
              title:
                'Whether to add the record number in the file as the attribute log.file.record_number.',
              type: 'bool',
              default: false,
            },
            {
              name: 'include_file_record_offset',
              required: false,
              show_user: false,
              title:
                'Whether to add the record offset in the file as the attribute log.file.record_offset.',
              type: 'bool',
              default: false,
            },
            {
              name: 'encoding',
              required: false,
              show_user: false,
              title: 'The encoding of the file being read.',
              description: 'The character encoding of the files being read.',
              type: 'select',
              multi: false,
              default: 'utf-8',
              options: [
                {
                  text: 'No encoding validation (raw bytes)',
                  value: 'nop',
                },
                {
                  text: 'UTF-8',
                  value: 'utf-8',
                },
                {
                  text: 'UTF-8 (without replacing invalid bytes)',
                  value: 'utf-8-raw',
                },
                {
                  text: 'UTF-16 Little Endian',
                  value: 'utf-16le',
                },
                {
                  text: 'UTF-16 Big Endian',
                  value: 'utf-16be',
                },
                {
                  text: 'ASCII',
                  value: 'ascii',
                },
                {
                  text: 'Big5 (Chinese character encoding)',
                  value: 'big5',
                },
              ],
            },
            {
              name: 'preserve_leading_whitespaces',
              required: false,
              show_user: false,
              title: 'Whether to preserve leading whitespaces in log entries.',
              type: 'bool',
              default: false,
            },
            {
              name: 'preserve_trailing_whitespaces',
              required: false,
              show_user: false,
              title: 'Whether to preserve trailing whitespaces in log entries.',
              type: 'bool',
              default: false,
            },
            {
              name: 'fingerprint_size',
              required: false,
              show_user: false,
              title: 'The number of bytes to use for file fingerprint.',
              description:
                'The number of bytes with which to identify a file. The first N bytes will be used to identify the file.',
              type: 'text',
              default: '1kb',
            },
            {
              name: 'initial_buffer_size',
              required: false,
              show_user: false,
              title: 'Initial buffer size for reading log entries.',
              description: 'The initial size of the buffer used to read log entries.',
              type: 'text',
              default: '16KiB',
            },
            {
              name: 'max_log_size',
              required: false,
              show_user: false,
              title: 'Maximum size of a log entry.',
              description:
                'The maximum size of a log entry to read before failing. Protects against malformed files.',
              type: 'text',
              default: '1MiB',
            },
            {
              name: 'poll_interval',
              required: false,
              show_user: false,
              title: 'The duration between filesystem polls.',
              type: 'duration',
              default: '200ms',
            },
            {
              name: 'force_flush_period',
              required: false,
              show_user: false,
              title: 'Time after which a partial log entry will be forcefully flushed.',
              description:
                'Time since last data was found in the file, after which currently buffered log will be emitted.',
              type: 'duration',
              default: '500ms',
            },
            {
              name: 'multiline_line_start_pattern',
              required: false,
              show_user: true,
              title: 'Multiline line start pattern',
              description:
                'Regular expression that matches the beginning of a new Nginx error log entry.',
              type: 'text',
              default: '^\\d{4}/\\d{2}/\\d{2} \\d{2}:\\d{2}:\\d{2}',
            },
            {
              name: 'multiline_line_end_pattern',
              required: false,
              show_user: false,
              title: 'Multiline line end pattern.',
              description:
                'A regular expression that matches the end of a log entry. Only one of line start pattern or line end pattern can be set.',
              type: 'text',
            },
            {
              name: 'multiline_omit_pattern',
              required: false,
              show_user: false,
              title: 'Omit the matching pattern from the log entry.',
              description:
                'If true, the matching line start/end pattern will not be included in the resulting log entry.',
              type: 'bool',
              default: false,
            },
            {
              name: 'timezone',
              type: 'text',
              title: 'Timezone',
              required: false,
              show_user: true,
              default: 'UTC',
              description:
                'IANA timezone of the Nginx host (for example UTC or America/New_York). Error log timestamps have no offset; this valu...',
            },
          ],
          title: 'Nginx Error Logs',
          description:
            'Tail Nginx error logs using the OTel Collector filelogreceiver, with multiline support for entries that span multiple lines.',
          enabled: true,
        },
      ],
      package: 'nginx_otel_integration',
      path: 'error',
    },
    {
      type: 'metrics',
      dataset: 'nginxreceiver',
      title: 'Nginx Metrics',
      release: 'beta',
      streams: [
        {
          input: 'nginx_otel_input',
          vars: [
            {
              name: 'endpoint',
              type: 'text',
              required: true,
              description: 'The URL of the Nginx stub_status endpoint.',
              default: 'http://localhost:80/nginx_status',
              title: 'Nginx Status Endpoint',
              show_user: true,
            },
            {
              name: 'collection_interval',
              type: 'duration',
              required: false,
              description: 'Time between each collection.',
              default: '10s',
              show_user: true,
              title: 'Collection Interval',
            },
            {
              name: 'initial_delay',
              type: 'duration',
              required: false,
              description: 'How long this receiver waits before starting.',
              default: '1s',
              show_user: false,
              title: 'Initial Delay',
            },
          ],
          title: 'Nginx stub_status Metrics',
          description:
            'Performance metrics from the Nginx stub_status module: request count, accepted and handled connections, and current connections by state (active, reading, writing, waiting).',
          enabled: true,
        },
      ],
      package: 'nginx_otel_integration',
      path: 'metrics',
    },
  ],
} as unknown as PackageInfo;
