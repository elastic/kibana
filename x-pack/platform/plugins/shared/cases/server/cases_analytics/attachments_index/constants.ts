/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Owner } from '../../../common/constants/types';

const CAI_ATTACHMENTS_INDEX_NAME_BASE = '.internal.cases-attachments';
export function getAttachmentsDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_ATTACHMENTS_INDEX_NAME_BASE}.${spaceId}-${owner}`.toLowerCase();
}

const CAI_ATTACHMENTS_INDEX_ALIAS_BASE = '.cases-attachments';
export function getAttachmentsDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_ATTACHMENTS_INDEX_ALIAS_BASE}.${spaceId}-${owner}`.toLowerCase();
}

export const CAI_ATTACHMENTS_INDEX_VERSION = 1;

export const CAI_ATTACHMENTS_SYNC_TYPE = 'cai_attachments_sync';

export const getAttachmentsSourceQuery = (spaceId: string, owner: Owner) => ({
  bool: {
    filter: [
      {
        term: {
          type: 'cases-comments',
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
    must: [
      {
        bool: {
          should: [
            {
              term: {
                'cases-comments.type': 'externalReference',
              },
            },
            {
              term: {
                'cases-comments.type': 'alert',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

export const CAI_ATTACHMENTS_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

const CAI_ATTACHMENTS_BACKFILL_TASK_ID = 'cai_attachments_backfill_task';
export const getCAIAttachmentsBackfillTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_ATTACHMENTS_BACKFILL_TASK_ID}-${spaceId}-${owner}`;
};

const CAI_ATTACHMENTS_SYNCHRONIZATION_TASK_ID = 'cai_cases_attachments_synchronization_task';
export const getCAIAttachmentsSynchronizationTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_ATTACHMENTS_SYNCHRONIZATION_TASK_ID}-${spaceId}-${owner}`;
};

export const getAttachmentsSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => {
  const baseQuery = getAttachmentsSourceQuery(spaceId, owner);
  return {
    bool: {
      filter: baseQuery.bool.filter,
      must: [
        ...baseQuery.bool.must,
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
  };
};
