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

export const apachePackageInfo = {
  name: 'apache',
  title: 'Apache HTTP Server',
  version: '3.0.2',
  release: 'ga',
  description:
    'Collect access logs, error logs, and mod_status metrics from Apache HTTP Server via Elastic Agent.',
  type: 'integration',
  policy_templates: [
    {
      name: 'apache',
      title: 'Apache logs and metrics',
      description: 'Collect logs and metrics from Apache instances',
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
          title: 'Collect logs from Apache instances',
          description: 'Collecting Apache access and error logs',
        },
        {
          type: 'apache/metrics',
          vars: [
            {
              name: 'hosts',
              type: 'text',
              title: 'Hosts',
              multi: true,
              required: true,
              show_user: true,
              default: ['http://127.0.0.1'],
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
            {
              name: 'ssl',
              type: 'yaml',
              title: 'SSL Configuration',
              description:
                'SSL configuration options. See [documentation](https://www.elastic.co/guide/en/fleet/current/elastic-agent-ssl-config...',
              multi: false,
              required: false,
              show_user: false,
              default:
                '#certificate_authorities:\n#  - |\n#    -----BEGIN CERTIFICATE-----\n#    MIIDCjCCAfKgAwIBAgITJ706Mu2wJlKckpIvkWxEHvEyijANBgkqhkiG9w0BAQsF\n#    ADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcNMTkwNzIyMTkyOTA0WhgPMjExOTA2\n#    MjgxOTI5MDRaMBQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEB\n#    BQADggEPADCCAQoCggEBANce58Y/JykI58iyOXpxGfw0/gMvF0hUQAcUrSMxEO6n\n#    fZRA49b4OV4SwWmA3395uL2eB2NB8y8qdQ9muXUdPBWE4l9rMZ6gmfu90N5B5uEl\n#    94NcfBfYOKi1fJQ9i7WKhTjlRkMCgBkWPkUokvBZFRt8RtF7zI77BSEorHGQCk9t\n#    /D7BS0GJyfVEhftbWcFEAG3VRcoMhF7kUzYwp+qESoriFRYLeDWv68ZOvG7eoWnP\n#    PsvZStEVEimjvK5NSESEQa9xWyJOmlOKXhkdymtcUd/nXnx6UTCFgnkgzSdTWV41\n#    CI6B6aJ9svCTI2QuoIq2HxX/ix7OvW1huVmcyHVxyUECAwEAAaNTMFEwHQYDVR0O\n#    BBYEFPwN1OceFGm9v6ux8G+DZ3TUDYxqMB8GA1UdIwQYMBaAFPwN1OceFGm9v6ux\n#    8G+DZ3TUDYxqMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAG5D\n#    874A4YI7YUwOVsVAdbWtgp1d0zKcPRR+r2OdSbTAV5/gcS3jgBJ3i1BN34JuDVFw\n#    3DeJSYT3nxy2Y56lLnxDeF8CUTUtVQx3CuGkRg1ouGAHpO/6OqOhwLLorEmxi7tA\n#    H2O8mtT0poX5AnOAhzVy7QW0D/k4WaoLyckM5hUa6RtvgvLxOwA0U+VGurCDoctu\n#    8F4QOgTAWyh8EZIwaKCliFRSynDpv3JTUwtfZkxo6K6nce1RhCWFAsMvDZL8Dgc0\n#    yvgJ38BRsFOtkRuAGSf6ZUwTO8JJRRIFnpUzXflAnGivK9M13D5GEQMmIl6U9Pvk\n#    sxSmbIUfc2SGJGCJD4I=\n#    -----END CERTIFICATE-----\n',
            },
          ],
          title: 'Collect metrics from Apache instances',
          description: 'Collecting Apache status metrics',
        },
      ],
      multiple: true,
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'apache.access',
      title: 'Apache access logs',
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
              default: [
                '/var/log/apache2/access.log*',
                '/var/log/apache2/other_vhosts_access.log*',
                '/var/log/httpd/access_log*',
              ],
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
            {
              name: 'tags',
              type: 'text',
              title: 'Tags',
              multi: true,
              required: true,
              show_user: false,
              default: ['apache-access'],
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
          ],
          title: 'Apache access logs',
          description: 'Collect Apache access logs',
          enabled: true,
          ingestion_method: 'File',
        },
      ],
      package: 'apache',
      path: 'access',
    },
    {
      type: 'logs',
      dataset: 'apache.error',
      title: 'Apache error logs',
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
              default: ['/var/log/apache2/error.log*', '/var/log/httpd/error_log*'],
            },
            {
              name: 'tags',
              type: 'text',
              title: 'Tags',
              multi: true,
              required: true,
              show_user: false,
              default: ['apache-error'],
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
          ],
          title: 'Apache error logs',
          description: 'Collect Apache error logs',
          enabled: true,
          ingestion_method: 'File',
        },
      ],
      package: 'apache',
      path: 'error',
    },
    {
      type: 'metrics',
      dataset: 'apache.status',
      title: 'Apache status metrics',
      release: 'ga',
      streams: [
        {
          input: 'apache/metrics',
          vars: [
            {
              name: 'period',
              type: 'text',
              title: 'Period',
              multi: false,
              required: true,
              show_user: true,
              default: '30s',
            },
            {
              name: 'server_status_path',
              type: 'text',
              title: 'Server Status Path',
              multi: false,
              required: true,
              show_user: false,
              default: '/server-status',
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
          title: 'Apache status metrics',
          description: 'Collect Apache status metrics',
          enabled: true,
          ingestion_method: 'API',
        },
      ],
      package: 'apache',
      path: 'status',
    },
  ],
} as unknown as PackageInfo;

export const apacheInputOtelPackageInfo = {
  name: 'apache_input_otel',
  title: 'Apache HTTP Server (OpenTelemetry)',
  version: '0.1.2',
  release: 'beta',
  description: 'Collect Apache HTTP Server metrics via the OTel apachereceiver.',
  type: 'input',
  policy_templates: [
    {
      name: 'apachereceiver',
      title: 'Apache HTTP Server Metrics (OpenTelemetry)',
      description: 'Collect Apache HTTP Server status metrics using OpenTelemetry Collector',
      multiple: true,
      type: 'metrics',
      input: 'otelcol',
      template_path: 'input.yml.hbs',
      vars: [
        {
          name: 'endpoint',
          type: 'text',
          required: true,
          title: 'Endpoint',
          description: 'The URL of the Apache server-status endpoint.',
          default: 'http://localhost:8080/server-status?auto',
          show_user: true,
        },
        {
          name: 'collection_interval',
          type: 'duration',
          required: false,
          title: 'Collection Interval',
          description: 'Time between each collection (e.g., 10s, 1m).',
          default: '10s',
          show_user: false,
        },
        {
          name: 'initial_delay',
          type: 'duration',
          required: false,
          title: 'Initial Delay',
          description: 'Defines how long this receiver waits before starting.',
          default: '1s',
          show_user: false,
        },
        {
          name: 'timeout',
          type: 'duration',
          required: false,
          title: 'HTTP Timeout',
          description: 'HTTP request timeout (e.g., 10s, 30s).',
          default: '10s',
          show_user: false,
        },
        {
          name: 'tls_enabled',
          type: 'bool',
          title: 'Enable TLS Configuration',
          required: false,
          description: 'Enable TLS configuration for HTTPS endpoints',
          default: false,
          show_user: true,
        },
        {
          name: 'tls_insecure',
          type: 'bool',
          required: false,
          title: 'Disable TLS',
          description:
            'Whether to disable client transport security for the connection. Set to true to disable TLS.',
          default: false,
          show_user: false,
        },
        {
          name: 'tls_insecure_skip_verify',
          type: 'bool',
          required: false,
          title: 'Skip TLS Verification',
          description: 'Set to true to skip TLS certificate verification.',
          default: false,
          show_user: false,
        },
        {
          name: 'tls_ca_file',
          type: 'text',
          required: false,
          title: 'TLS CA File',
          description: 'Path to the CA certificate file for TLS verification.',
          show_user: false,
        },
        {
          name: 'tls_cert_file',
          type: 'text',
          required: false,
          title: 'TLS Certificate File',
          description: 'Path to the client TLS certificate file.',
          show_user: false,
        },
        {
          name: 'tls_key_file',
          type: 'text',
          required: false,
          title: 'TLS Key File',
          description: 'Path to the client TLS key file.',
          show_user: false,
        },
        {
          name: 'tls_server_name_override',
          type: 'text',
          required: false,
          title: 'TLS Server Name Override',
          description: 'Override the server name used for TLS verification.',
          show_user: false,
        },
      ],
    },
  ],
} as unknown as PackageInfo;
