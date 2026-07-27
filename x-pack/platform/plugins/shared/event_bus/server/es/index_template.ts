/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsNames } from './names';

/**
 * Datastream mapping. `payload` is unindexed (`enabled: false`) to avoid mapping
 * explosion — subscribers filter on `event.type`/`target`, never on payload.
 * `dynamic: false` so unexpected fields never mutate the mapping.
 */
export const getEventBusMappings = () => ({
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    event: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
    target: { type: 'keyword' },
    source: { type: 'keyword' },
    space: { type: 'keyword' },
    partition: { type: 'keyword' },
    payload: { type: 'object', enabled: false },
  },
});

/**
 * Composable index template for the event bus datastream. Mirrors the event_log
 * bootstrap: single shard (total order within a backing index), hidden, and
 * time-based retention via Data Stream Lifecycle (DSL) — NOT ILM.
 */
export const getIndexTemplate = (names: EsNames, retention: string): Record<string, unknown> => ({
  _meta: {
    description: 'index template for the Kibana event bus',
    managed: true,
  },
  index_patterns: [names.dataStream],
  data_stream: {
    hidden: true,
  },
  priority: 50,
  template: {
    settings: {
      hidden: true,
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
    lifecycle: {
      data_retention: retention,
    },
    mappings: getEventBusMappings(),
  },
});
