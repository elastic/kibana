/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDefinition } from '../unit';

export const GET_UNIT_EXAMPLE: UnitDefinition = {
  id: 'logs-observability',
  name: 'Logs observability',
  description: 'Example unit definition returned by GET /unit.',
  sources: [
    {
      id: 'otlp-production-services',
      name: 'Production services',
      type: 'otlp',
      to: null,
      path_template: '/{service.name}/{service.environment}',
      config: {
        otlp: {
          signals: ['logs', 'metrics', 'traces'],
        },
      },
    },
    {
      id: 'async-bulk-edge-workers',
      name: 'Edge workers',
      type: 'async_bulk',
      to: null,
      path_template: '/{dataset}/{namespace}',
    },
    {
      id: 'prometheus-remote-write-platform',
      name: 'Platform metrics',
      type: 'prometheus_remote_write',
      to: null,
      path_template: '/{service.name}',
      config: {
        prometheus_remote_write: {},
      },
    },
    {
      id: 'bulk-legacy-logs',
      name: 'Legacy logs',
      type: 'bulk',
      to: null,
      path_template: '/{dataset}/{namespace}',
    },
  ],
  destinations: [],
  pipelines: [],
  pipeline_definitions: [],
  routing_nodes: [],
};
