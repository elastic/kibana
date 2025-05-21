/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const CAI_ATTACHMENTS_INDEX_NAME = '.internal.cases-attachments';

export const CAI_ATTACHMENTS_SOURCE_QUERY: QueryDslQueryContainer = {
  bool: {
    must: {
      match: {
        type: 'cases-comments',
      },
    },
    filter: {
      bool: {
        must_not: {
          term: {
            'cases-comments.type': 'user',
          },
        },
      },
    },
  },
};

export const CAI_ATTACHMENTS_SOURCE_INDEX = '.kibana_alerting_cases';
