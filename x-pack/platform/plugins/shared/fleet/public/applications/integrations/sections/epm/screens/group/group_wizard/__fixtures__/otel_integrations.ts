/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: the self-contained OTel integrations from the package structure design
// (workbench active/integrations-and-streams/package-structure.md): `nginx_otel` 1.0.0 and
// `apache_otel` become `type: integration` with inline `input: otelcol` streams and their own
// Kibana content, no `requires`. Derived from the composable / input package fixtures, which have
// the same data streams and setting names.

import type { PackageInfo } from '../../../../../../../../types';
import type { RegistryDataStream } from '../../../../../../../../../common/types';

import { nginxOtelPackageInfo } from './nginx';
import { apacheInputOtelPackageInfo } from './apache';

const inlineOtelcol = (dataStreams: RegistryDataStream[], pkgName: string) =>
  dataStreams.map((ds) => ({
    ...ds,
    package: pkgName,
    streams: (ds.streams ?? []).map((stream) => ({ ...stream, input: 'otelcol' })),
  }));

export const nginxOtelIntegrationPackageInfo = {
  ...nginxOtelPackageInfo,
  name: 'nginx_otel',
  title: 'Nginx OpenTelemetry',
  version: '1.0.0',
  requires: undefined,
  policy_templates: [
    {
      name: 'nginx',
      title: 'Nginx logs and metrics',
      description: 'Collect metrics and logs from Nginx using OpenTelemetry receivers',
      data_streams: ['access', 'error', 'metrics'],
      inputs: [
        {
          type: 'otelcol',
          title: 'Collect Nginx logs and metrics (OpenTelemetry)',
          description: 'Nginx receiver and filelog receiver in the EDOT collector',
        },
      ],
      multiple: true,
    },
  ],
  data_streams: inlineOtelcol(nginxOtelPackageInfo.data_streams ?? [], 'nginx_otel'),
  assets: {
    kibana: {
      dashboard: [{}, {}, {}],
      alerting_rule_template: [{}, {}, {}, {}, {}, {}],
      slo_template: [{}, {}],
    },
    elasticsearch: {},
  },
} as unknown as PackageInfo;

// Same setting names as the input package (endpoint, collection_interval, ...).
const apacheReceiverVars = (
  apacheInputOtelPackageInfo.policy_templates?.[0] as { vars?: unknown[] } | undefined
)?.vars;

export const apacheOtelIntegrationPackageInfo = {
  name: 'apache_otel',
  title: 'Apache HTTP Server OpenTelemetry',
  version: '1.0.0',
  release: 'beta',
  description: 'Collect Apache HTTP Server metrics with the EDOT collector.',
  type: 'integration',
  policy_templates: [
    {
      name: 'apache',
      title: 'Apache HTTP Server metrics',
      description: 'Collect Apache HTTP Server status metrics using OpenTelemetry Collector',
      data_streams: ['metrics'],
      inputs: [{ type: 'otelcol', title: 'Collect Apache HTTP Server metrics (OpenTelemetry)' }],
      multiple: true,
    },
  ],
  data_streams: [
    {
      type: 'metrics',
      dataset: 'apachereceiver',
      title: 'Apache HTTP Server metrics',
      release: 'beta',
      package: 'apache_otel',
      path: 'metrics',
      streams: [
        {
          input: 'otelcol',
          title: 'Apache HTTP Server status metrics',
          description: 'Apache HTTP Server status metrics from the apachereceiver',
          vars: apacheReceiverVars,
          enabled: true,
        },
      ],
    },
  ],
} as unknown as PackageInfo;
