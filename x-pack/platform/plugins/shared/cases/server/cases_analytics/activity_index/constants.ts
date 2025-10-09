/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Owner } from '../../../common/constants/types';

const CAI_ACTIVITY_INDEX_NAME_BASE = '.internal.cases-activity';
export function getActivityDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_ACTIVITY_INDEX_NAME_BASE}.${spaceId}-${owner}`.toLowerCase();
}

const CAI_ACTIVITY_INDEX_ALIAS_BASE = '.cases-activity';
export function getActivityDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_ACTIVITY_INDEX_ALIAS_BASE}.${spaceId}-${owner}`.toLowerCase();
}

export const CAI_ACTIVITY_INDEX_VERSION = 1;

export const CAI_ACTIVITY_SYNC_TYPE = 'cai_activity_sync';

export const getActivitySourceQuery = (spaceId: string, owner: Owner) => ({
  bool: {
    filter: [
      {
        term: {
          type: 'cases-user-actions',
        },
      },
      {
        term: {
          namespaces: spaceId,
        },
      },
      {
        term: {
          'cases-user-actions.owner': owner,
        },
      },
    ],
    must: [
      {
        bool: {
          should: [
            {
              term: {
                'cases-user-actions.type': 'severity',
              },
            },
            {
              term: {
                'cases-user-actions.type': 'delete_case',
              },
            },
            {
              term: {
                'cases-user-actions.type': 'category',
              },
            },
            {
              term: {
                'cases-user-actions.type': 'status',
              },
            },
            {
              term: {
                'cases-user-actions.type': 'tags',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

export const CAI_ACTIVITY_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

const CAI_ACTIVITY_BACKFILL_TASK_ID = 'cai_activity_backfill_task';
export const getCAIActivityBackfillTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_ACTIVITY_BACKFILL_TASK_ID}-${spaceId}-${owner}`;
};

const CAI_ACTIVITY_SYNCHRONIZATION_TASK_ID = 'cai_cases_activity_synchronization_task';
export const getCAIActivitySynchronizationTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_ACTIVITY_SYNCHRONIZATION_TASK_ID}-${spaceId}-${owner}`;
};

export const getActivitySynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => {
  const baseQuery = getActivitySourceQuery(spaceId, owner);
  return {
    bool: {
      filter: baseQuery.bool.filter,
      must: [
        ...baseQuery.bool.must,
        {
          range: {
            'cases-user-actions.created_at': {
              gte: lastSyncAt.toISOString(),
            },
          },
        },
      ],
    },
  };
};
