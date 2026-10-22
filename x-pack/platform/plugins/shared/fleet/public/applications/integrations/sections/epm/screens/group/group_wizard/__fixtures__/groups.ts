/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: integration group list items as served by the local registry search endpoint
// (nginx_group, apache_group), plus a single-schema group: package-spec accepts one schema
// without `default`. Schemas name their package directly, with no version.

import type { PackageListItem } from '../../../../../../../../types';

export const nginxGroupItem = {
  id: 'nginx_group',
  name: 'nginx_group',
  title: 'Nginx',
  version: '0.1.0',
  release: 'beta',
  type: 'integration',
  description: 'Collect logs and metrics from Nginx.',
  schemas: {
    ecs: { package: 'nginx' },
    otel: { default: true, package: 'nginx_otel' },
  },
} as unknown as PackageListItem;

export const apacheGroupItem = {
  id: 'apache_group',
  name: 'apache_group',
  title: 'Apache HTTP Server',
  version: '0.1.0',
  release: 'beta',
  type: 'integration',
  description: 'Collect logs and metrics from Apache HTTP Server.',
  schemas: {
    ecs: { package: 'apache' },
    otel: { default: true, package: 'apache_otel' },
  },
} as unknown as PackageListItem;

export const singleSchemaGroupItem = {
  id: 'nginx_otel_only_group',
  name: 'nginx_otel_only_group',
  title: 'Nginx',
  version: '0.1.0',
  release: 'beta',
  type: 'integration',
  description: 'Collect logs and metrics from Nginx with OpenTelemetry.',
  schemas: { otel: { package: 'nginx_otel' } },
} as unknown as PackageListItem;
