/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * `.cases-data.case_activity` mapping — append-only, one document per user-action SO.
 *
 * `cases.id` is the join key back to the `case` surface. Activity rows do NOT carry
 * the case's extended fields — those would explode index size with little analytical
 * value (use the `case` or `case_lifecycle` surface for extended-field analysis).
 */
export const CASE_ACTIVITY_INDEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
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
      },
    },

    case_activity: {
      properties: {
        id: { type: 'keyword' },
        action: { type: 'keyword' },
        type: { type: 'keyword' },
        // Raw payload preserved verbatim for forensic / replay purposes; not indexed.
        payload: { type: 'object', enabled: false },
        created_at: { type: 'date' },
        created_by: {
          properties: {
            username: { type: 'keyword' },
            full_name: { type: 'keyword' },
            email: { type: 'keyword' },
            profile_uid: { type: 'keyword' },
          },
        },
      },
    },
  },
};
