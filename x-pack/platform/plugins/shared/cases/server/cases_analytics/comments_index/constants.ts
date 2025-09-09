/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Owner } from '../../../common/constants/types';

export const CAI_COMMENTS_INDEX_NAME_BASE = '.internal.cases-comments';
export function getCommentsDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_COMMENTS_INDEX_NAME_BASE}.${spaceId}-${owner}`.toLowerCase();
}

export const CAI_COMMENTS_INDEX_ALIAS_BASE = '.cases-comments';
export function getCommentsDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_COMMENTS_INDEX_ALIAS_BASE}.${spaceId}-${owner}`.toLowerCase();
}

export const CAI_COMMENTS_INDEX_VERSION = 1;

export const CAI_COMMENTS_SYNC_TYPE = 'cai_comments_sync';

export const getCommentsSourceQuery = (spaceId: string, owner: Owner): QueryDslQueryContainer => ({
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
      {
        term: {
          namespaces: spaceId,
        },
      },
      {
        term: {
          'cases-comments.owner': owner,
        },
      },
    ],
  },
});

export const CAI_COMMENTS_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

const CAI_COMMENTS_BACKFILL_TASK_ID = 'cai_comments_backfill_task';
export const getCAICommentsBackfillTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_COMMENTS_BACKFILL_TASK_ID}-${spaceId}-${owner}`;
};

const CAI_COMMENTS_SYNCHRONIZATION_TASK_ID = 'cai_cases_comments_synchronization_task';
export const getCAICommentsSynchronizationTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_COMMENTS_SYNCHRONIZATION_TASK_ID}-${spaceId}-${owner}`;
};

export const getCommentsSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    filter: getCommentsSourceQuery(spaceId, owner).bool?.filter,
    must: [
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
