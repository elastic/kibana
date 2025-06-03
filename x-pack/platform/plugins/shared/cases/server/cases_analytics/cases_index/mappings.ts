/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { CAI_CASES_INDEX_SCRIPT_ID } from './painless_scripts';

export const CAI_CASES_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  _meta: {
    mapping_version: 1,
    painless_script_id: CAI_CASES_INDEX_SCRIPT_ID,
  },
  properties: {
    '@timestamp': {
      type: 'date',
    },
    title: {
      type: 'keyword',
    },
    description: {
      type: 'keyword',
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
    // Application level
    time_to_resolve: {
      type: 'long', // in seconds, calculated by case.closed_at - case.created_at
    },
    // leaving these commented out for that since in_progress_at does not exist.
    // time_to_acknowledge: {
    //   type: 'long', // in seconds, calculated by case.in_progress_at - case.created_at
    // },
    // time_to_investigaste: {
    //   type: 'long', // in seconds, calculated by case.closed_at - case.in_progress_at
    // },
    // custom_fields might change to type: 'nested' like in cases
    custom_fields: {
      properties: {
        type: {
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
          // called typeKey in the cases mapping
          type: 'keyword',
        },
        // Application level
        // label: {
        //   type: 'keyword',
        // },
      },
    },
    total_assignees: {
      type: 'integer',
    },
    owner: {
      type: 'keyword',
    },
    // Where does this come from?
    // spaceId: {
    //   type: 'keyword',
    // },
  },
};
