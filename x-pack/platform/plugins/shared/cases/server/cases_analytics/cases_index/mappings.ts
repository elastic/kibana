/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const CAI_CASES_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date',
    },
    title: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    description: {
      type: 'text',
    },
    tags: {
      type: 'keyword',
    },
    category: {
      type: 'keyword',
    },
    status: {
      type: 'keyword',
    },
    status_sort: {
      type: 'short',
    },
    severity: {
      type: 'keyword',
    },
    severity_sort: {
      type: 'short',
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
    updated_at: {
      type: 'date',
    },
    updated_at_ms: {
      type: 'long',
    },
    updated_by: {
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
    closed_at: {
      type: 'date',
    },
    closed_at_ms: {
      type: 'long',
    },
    closed_by: {
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
    assignees: {
      type: 'keyword',
    },
    time_to_resolve: {
      type: 'long',
    },
    time_to_acknowledge: {
      type: 'long',
    },
    time_to_investigate: {
      type: 'long',
    },
    custom_fields: {
      properties: {
        type: {
          type: 'keyword',
        },
        key: {
          type: 'keyword',
        },
        value: {
          type: 'keyword',
        },
      },
    },
    observables: {
      properties: {
        type: {
          // called typeKey in the cases mapping
          type: 'keyword',
        },
        value: {
          type: 'keyword',
        },
      },
    },
    total_assignees: {
      type: 'integer',
    },
    owner: {
      type: 'keyword',
    },
    space_ids: {
      type: 'keyword',
    },
    total_alerts: {
      type: 'integer',
    },
    total_comments: {
      type: 'integer',
    },
  },
};
