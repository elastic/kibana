/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const CAI_ACTIVITY_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date',
    },
    case_id: {
      type: 'keyword',
    },
    action: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
    payload: {
      properties: {
        status: {
          type: 'keyword',
        },
        tags: {
          type: 'keyword',
        },
        category: {
          type: 'keyword',
        },
        severity: {
          type: 'keyword',
        },
        assignees: {
          properties: {
            uid: {
              type: 'keyword',
            },
          },
        },
        pushed: {
          properties: {
            connector_id: {
              type: 'keyword',
            },
            connector_name: {
              type: 'keyword',
            },
            external_id: {
              type: 'keyword',
            },
            external_title: {
              type: 'keyword',
            },
            external_url: {
              type: 'keyword',
            },
            pushed_at: {
              type: 'date',
            },
          },
        },
        title: {
          type: 'keyword',
        },
        description: {
          type: 'text',
        },
        custom_fields: {
          type: 'flattened',
        },
        comment: {
          type: 'text',
        },
        comment_type: {
          type: 'keyword',
        },
        comment_id: {
          type: 'keyword',
        },
      },
    },
    created_at: {
      type: 'date',
    },
    created_at_ms: {
      type: 'long',
    },
    created_by: {
      properties: {
        username: {
          type: 'keyword',
        },
        profile_uid: {
          type: 'keyword',
        },
        full_name: {
          type: 'keyword',
        },
        email: {
          type: 'keyword',
        },
      },
    },
    owner: {
      type: 'keyword',
    },
    space_ids: {
      type: 'keyword',
    },
  },
};
