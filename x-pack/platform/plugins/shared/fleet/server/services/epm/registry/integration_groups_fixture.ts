/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE ONLY. Same shape as the package registry `GET /groups`, so the UI can be shown against
// a registry that doesn't serve groups yet. Enabled with
// `xpack.fleet.enableExperimental: ['integrationGroupsFixture']`, only used when the registry
// returns no groups.

import type { IntegrationGroup } from '../../../../common/types';

export const INTEGRATION_GROUPS_FIXTURE: IntegrationGroup[] = [
  {
    name: 'nginx',
    title: 'Nginx',
    description: 'Collect logs and metrics from Nginx web servers.',
    icon: 'nginx',
    schemas: {
      otel: { package: 'nginx_otel', default: true },
      ecs: { package: 'nginx' },
    },
  },
];
