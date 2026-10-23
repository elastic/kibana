/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: integration groups as served by the package registry `GET /groups` (from the
// integrations repo taxonomy file), plus a single-schema group: one schema needs no `default`.
// Groups aren't packages; schemas name their package directly, with no version.

import type { IntegrationGroup } from '../../../../../../../../types';

export const nginxGroup: IntegrationGroup = {
  name: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx web servers.',
  icon: 'nginx',
  schemas: {
    otel: { package: 'nginx_otel', default: true },
    ecs: { package: 'nginx' },
  },
};

export const apacheGroup: IntegrationGroup = {
  name: 'apache',
  title: 'Apache HTTP Server',
  description: 'Collect logs and metrics from Apache HTTP Server.',
  icon: 'apache',
  schemas: {
    otel: { package: 'apache_otel', default: true },
    ecs: { package: 'apache' },
  },
};

export const singleSchemaGroup: IntegrationGroup = {
  name: 'nginx_otel_only',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx with OpenTelemetry.',
  icon: 'nginx_otel',
  schemas: { otel: { package: 'nginx_otel' } },
};
