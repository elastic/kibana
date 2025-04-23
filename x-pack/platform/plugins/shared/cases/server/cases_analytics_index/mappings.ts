/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const CAI_CASES_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  _meta: {
    mapping_version: 1,
  },
  properties: {
    '@timestamp': {
      type: 'date',
    },
    id: {
      type: 'keyword',
    },
    actual_title: {
      type: 'keyword',
    },
  },
};

export const CAI_ATTACHMENTS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  _meta: {
    mapping_version: 1,
  },
  properties: {
    id: {
      type: 'keyword',
    },
    title: {
      type: 'keyword',
    },
    NEW_FIELD: {
      type: 'keyword',
    },
  },
};

export const CAI_COMMENTS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {},
};
