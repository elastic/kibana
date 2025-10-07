/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Owner } from '../../../common/constants/types';

const CAI_CASES_INDEX_NAME_BASE = '.internal.cases';
export function getCasesDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_CASES_INDEX_NAME_BASE}.${spaceId}-${owner}`.toLowerCase();
}

const CAI_CASES_INDEX_ALIAS_BASE = '.cases';
export function getCasesDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_CASES_INDEX_ALIAS_BASE}.${spaceId}-${owner}`.toLowerCase();
}

export const CAI_CASES_INDEX_VERSION = 1;

export const CAI_CASES_SYNC_TYPE = 'cai_cases_sync';

export const getCasesSourceQuery = (spaceId: string, owner: Owner): QueryDslQueryContainer => ({
  bool: {
    filter: [
      {
        term: {
          type: 'cases',
        },
      },
      {
        term: {
          namespaces: spaceId,
        },
      },
      {
        term: {
          'cases.owner': owner,
        },
      },
    ],
  },
});

export const CAI_CASES_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

const CAI_CASES_BACKFILL_TASK_ID = 'cai_cases_backfill_task';
export const getCAICasesBackfillTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_CASES_BACKFILL_TASK_ID}-${spaceId}-${owner}`;
};

const CAI_CASES_SYNCHRONIZATION_TASK_ID_BASE = 'cai_cases_synchronization_task';
export const getCAICasesSynchronizationTaskId = (spaceId: string, owner: Owner) =>
  `${CAI_CASES_SYNCHRONIZATION_TASK_ID_BASE}-${spaceId}-${owner}`;

export const getCasesSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    filter: getCasesSourceQuery(spaceId, owner).bool?.filter,
    must: [
      {
        bool: {
          should: [
            {
              range: {
                'cases.created_at': {
                  gte: lastSyncAt.toISOString(),
                },
              },
            },
            {
              range: {
                'cases.updated_at': {
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
