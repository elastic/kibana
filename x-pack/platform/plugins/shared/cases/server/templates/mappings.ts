/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const CASES_EXTENDED_FIELDS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date',
    },
    case_id: {
      type: 'keyword',
    },
    owner: {
      type: 'keyword',
    },
    space_id: {
      type: 'keyword',
    },
    created_at: {
      type: 'date',
    },
    updated_at: {
      type: 'date',
    },
    extended_fields: {
      type: 'object',
      dynamic: true,
    },
  },
};
