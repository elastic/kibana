/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { EXTENDED_FIELDS_DYNAMIC_TEMPLATES } from './extended_fields';

/**
 * `.cases-data.case` mapping — one document per case, keyed on case id.
 *
 * The shape mirrors what alerts-as-data does for `.alerts-*`: small, ECS-aligned,
 * aggregation-friendly. Lens auto-discovery and Discover ergonomics are the primary
 * ergonomics target.
 */
export const CASE_INDEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  dynamic_templates: EXTENDED_FIELDS_DYNAMIC_TEMPLATES,
  properties: {
    '@timestamp': { type: 'date' },

    kibana: {
      properties: {
        space_ids: { type: 'keyword' },
      },
    },

    cases: {
      properties: {
        owner: { type: 'keyword' },
        id: { type: 'keyword' },
        title: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 1024 } },
        },
        description: { type: 'text' },
        status: { type: 'keyword' },
        severity: { type: 'keyword' },
        tags: { type: 'keyword' },
        category: { type: 'keyword' },
        assignees: {
          type: 'nested',
          properties: {
            uid: { type: 'keyword' },
          },
        },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        closed_at: { type: 'date' },
        created_by: {
          properties: {
            username: { type: 'keyword' },
            full_name: { type: 'keyword' },
            email: { type: 'keyword' },
            profile_uid: { type: 'keyword' },
          },
        },
        duration_ms: { type: 'long' },
        total_alerts: { type: 'long' },
        total_comments: { type: 'long' },
        // Free-form sub-objects we don't want to index field-by-field. Stored for
        // retrieval; not searchable. Lens / Discover treat these as opaque blobs.
        observables: { type: 'object', enabled: false },
        custom_fields: { type: 'object', enabled: false },
        extended_fields: { type: 'object', dynamic: true },
      },
    },
  },
};
