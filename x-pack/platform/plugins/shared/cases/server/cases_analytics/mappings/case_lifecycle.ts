/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { EXTENDED_FIELDS_DYNAMIC_TEMPLATES } from './extended_fields';

/**
 * `.cases-data.case_lifecycle` mapping — one document per case, recomputed on every
 * status transition (close/reopen). Drives MTTR / MTTD / SLA-style dashboards.
 *
 * Recomputed in-process by the writer rather than via a pivot transform, sidestepping
 * the multi-node race conditions that came with the legacy transform-based approach.
 */
export const CASE_LIFECYCLE_INDEX_MAPPING: MappingTypeMapping = {
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
        extended_fields: { type: 'object', dynamic: true },
      },
    },

    case_lifecycle: {
      properties: {
        final_status: { type: 'keyword' },
        final_severity: { type: 'keyword' },
        time_to_first_response_ms: { type: 'long' },
        time_to_close_ms: { type: 'long' },
        time_open_ms: { type: 'long' },
        total_comments: { type: 'long' },
        total_assignee_changes: { type: 'long' },
        total_status_changes: { type: 'long' },
        created_at: { type: 'date' },
        closed_at: { type: 'date' },
      },
    },
  },
};
