/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { CAI_COMMENTS_INDEX_SCRIPT_ID } from './painless_scripts';
import { CAI_COMMENTS_INDEX_VERSION } from './constants';

export const CAI_COMMENTS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  _meta: {
    mapping_version: CAI_COMMENTS_INDEX_VERSION,
    painless_script_id: CAI_COMMENTS_INDEX_SCRIPT_ID,
  },
  properties: {
    '@timestamp': {
      type: 'date',
    },
    case_id: {
      type: 'keyword',
    },
    comment: {
      type: 'text',
    },
    created_at: {
      type: 'date',
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
