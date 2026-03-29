/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const catalogIndexMapping: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'keyword',
      fields: {
        text: { type: 'text' },
      },
    },
    type: { type: 'keyword' },
    mapping: {
      properties: {
        fields: {
          type: 'nested',
          properties: {
            name: { type: 'keyword' },
            type: { type: 'keyword' },
            ecs: { type: 'boolean' },
            searchable: { type: 'boolean' },
            aggregatable: { type: 'boolean' },
          },
        },
        total_field_count: { type: 'integer' },
        ecs_field_count: { type: 'integer' },
        ecs_field_coverage: { type: 'float' },
      },
    },
    template: {
      properties: {
        name: { type: 'keyword' },
        meta: { type: 'object', enabled: false },
      },
    },
    integration: {
      properties: {
        package_name: { type: 'keyword' },
        package_title: { type: 'keyword' },
        package_version: { type: 'keyword' },
        integration_name: { type: 'keyword' },
        dataset: { type: 'keyword' },
        description: { type: 'text' },
        data_stream_title: { type: 'keyword' },
        icons: { type: 'object', enabled: false },
      },
    },
    stats: {
      properties: {
        doc_count: { type: 'long' },
        size_bytes: { type: 'long' },
        last_ingested_at: { type: 'date' },
        is_active: { type: 'boolean' },
        freshness_category: { type: 'keyword' },
      },
    },
    semantic: {
      properties: {
        summary: { type: 'text' },
        field_annotations: { type: 'object', enabled: false },
        topics: { type: 'keyword' },
        mitre_techniques: { type: 'keyword' },
        embedding: {
          type: 'dense_vector',
          dims: 384,
          index: true,
          similarity: 'cosine',
        },
      },
    },
    catalog_version: { type: 'integer' },
    refreshed_at: { type: 'date' },
  },
};
