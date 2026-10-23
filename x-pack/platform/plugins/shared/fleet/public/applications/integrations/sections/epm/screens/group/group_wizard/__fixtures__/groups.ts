/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: integration groups as built by Fleet from member packages (each bundles the group's
// `group.yml`), plus a single-schema group and a pick-any group (two members, same schema).

import type { IntegrationGroup } from '../../../../../../../../types';

export const nginxGroup: IntegrationGroup = {
  name: 'nginx',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx web servers.',
  icon: { package: 'nginx_otel', version: '1.0.0', path: 'img/nginx-group.svg' },
  default: 'nginx_otel',
  members: [
    { package: 'nginx_otel', version: '1.0.0', title: 'Nginx (OpenTelemetry)', schema: 'otel' },
    { package: 'nginx', version: '3.2.2', title: 'Nginx', schema: 'ecs' },
  ],
};

export const apacheGroup: IntegrationGroup = {
  name: 'apache',
  title: 'Apache HTTP Server',
  description: 'Collect logs and metrics from Apache HTTP Server.',
  default: 'apache_input_otel',
  members: [
    { package: 'apache_input_otel', version: '0.1.2', title: 'Apache OTel', schema: 'otel' },
    { package: 'apache', version: '3.0.2', title: 'Apache HTTP Server', schema: 'ecs' },
  ],
};

export const singleSchemaGroup: IntegrationGroup = {
  name: 'nginx_otel_only',
  title: 'Nginx',
  description: 'Collect logs and metrics from Nginx with OpenTelemetry.',
  members: [
    { package: 'nginx_otel', version: '1.0.0', title: 'Nginx (OpenTelemetry)', schema: 'otel' },
  ],
};

/** Pick-any: two ECS members (stands in for crowdstrike + ti_crowdstrike), plus a planned schema. */
export const pickAnyGroup: IntegrationGroup = {
  name: 'web',
  title: 'Web servers',
  description: 'Collect logs and metrics from web servers.',
  default: 'nginx',
  members: [
    { package: 'nginx', version: '3.2.2', title: 'Nginx', schema: 'ecs' },
    { package: 'apache', version: '3.0.2', title: 'Apache HTTP Server', schema: 'ecs' },
  ],
  schema_labels: { ecs: 'Legacy' },
  planned_schemas: ['prometheus'],
};
