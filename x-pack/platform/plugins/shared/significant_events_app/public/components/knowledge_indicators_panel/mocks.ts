/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';

export const createMockWiredStreamDefinition = (
  overrides: Partial<Streams.WiredStream.GetResponse> = {}
): Streams.WiredStream.GetResponse => ({
  stream: {
    type: 'wired',
    name: 'logs',
    description: '',
    updated_at: '2024-01-01T00:00:00.000Z',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
      settings: {},
      failure_store: { inherit: {} },
      wired: {
        fields: {
          'attributes.mapped_field': {
            type: 'keyword',
          },
        },
        routing: [],
      },
    },
  },
  privileges: {
    manage: true,
    monitor: true,
    lifecycle: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
    view_index_metadata: true,
    create_snapshot_repository: true,
  },
  data_stream_exists: true,
  inherited_fields: {
    'attributes.inherited_field': {
      type: 'keyword',
      from: 'logs.parent',
    },
  },
  effective_lifecycle: {
    dsl: {},
    from: 'logs',
  },
  effective_failure_store: {
    lifecycle: { disabled: {} },
    from: 'logs',
  },
  effective_settings: {},
  dashboards: [],
  rules: [],
  ...overrides,
});
