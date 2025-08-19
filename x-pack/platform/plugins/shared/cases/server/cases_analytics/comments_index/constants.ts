/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const CAI_COMMENTS_INDEX_NAME = '.internal.cases-comments';

export const CAI_COMMENTS_INDEX_ALIAS = '.cases-comments';

export const CAI_COMMENTS_INDEX_VERSION = 1;

export const CAI_COMMENTS_SOURCE_QUERY: QueryDslQueryContainer = {
  bool: {
    filter: [
      {
        term: {
          type: 'cases-comments',
        },
      },
      {
        term: {
          'cases-comments.type': 'user',
        },
      },
    ],
  },
};

export const CAI_COMMENTS_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

export const CAI_COMMENTS_BACKFILL_TASK_ID = 'cai_comments_backfill_task';

export const CAI_COMMENTS_SYNCHRONIZATION_TASK_ID = 'cai_cases_comments_synchronization_task';

export const getCommentsSynchronizationSourceQuery = (
  lastSyncAt: Date
): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        term: {
          'cases-comments.type': 'user',
        },
      },
      {
        term: {
          type: 'cases-comments',
        },
      },
      {
        bool: {
          should: [
            {
              range: {
                'cases-comments.created_at': {
                  gte: lastSyncAt.toISOString(),
                },
              },
            },
            {
              range: {
                'cases-comments.updated_at': {
                  gte: lastSyncAt.toISOString(),
                },
              },
            },
          ],
        },
      },
    ],
  },
});
