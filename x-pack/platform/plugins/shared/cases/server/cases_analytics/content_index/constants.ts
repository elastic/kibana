/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Owner } from '../../../common/constants/types';

// ---- Index naming ----

const CAI_CONTENT_INDEX_NAME_BASE = '.internal.cases-analytics';
export function getContentDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_CONTENT_INDEX_NAME_BASE}.${owner}-${spaceId}`.toLowerCase();
}

const CAI_CONTENT_INDEX_ALIAS_BASE = '.cases-analytics';
export function getContentDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_CONTENT_INDEX_ALIAS_BASE}.${owner}-${spaceId}`.toLowerCase();
}

export const CAI_CONTENT_INDEX_VERSION = 1;

export const CAI_CONTENT_SYNC_TYPE = 'cai_content_sync';

// ---- Doc type discriminator ----

export const DOC_TYPES = {
  CASE: 'case',
  COMMENT: 'comment',
  ATTACHMENT: 'attachment',
} as const;

export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES];

// ---- Source index ----

export const CAI_CONTENT_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

// ---- Source queries ----

export const getCasesSourceQuery = (spaceId: string, owner: Owner): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { type: 'cases' } },
      { term: { namespaces: spaceId } },
      { term: { 'cases.owner': owner } },
    ],
  },
});

export const getCommentsSourceQuery = (spaceId: string, owner: Owner): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { type: 'cases-comments' } },
      { term: { 'cases-comments.type': 'user' } },
      { term: { namespaces: spaceId } },
      { term: { 'cases-comments.owner': owner } },
    ],
  },
});

export const getAttachmentsSourceQuery = (
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { type: 'cases-comments' } },
      { term: { namespaces: spaceId } },
      { term: { 'cases-comments.owner': owner } },
    ],
    must: [
      {
        bool: {
          should: [
            { term: { 'cases-comments.type': 'externalReference' } },
            { term: { 'cases-comments.type': 'alert' } },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

/**
 * Combined source query for the content index: matches cases, comments, and attachments
 * in the same query so reindex-by-query populates one index.
 */
export const getContentSourceQuery = (spaceId: string, owner: Owner): QueryDslQueryContainer => ({
  bool: {
    filter: [{ term: { namespaces: spaceId } }],
    must: [
      {
        bool: {
          should: [
            // cases
            {
              bool: {
                filter: [{ term: { type: 'cases' } }, { term: { 'cases.owner': owner } }],
              },
            },
            // comments (user type)
            {
              bool: {
                filter: [
                  { term: { type: 'cases-comments' } },
                  { term: { 'cases-comments.type': 'user' } },
                  { term: { 'cases-comments.owner': owner } },
                ],
              },
            },
            // attachments (alert + externalReference)
            {
              bool: {
                filter: [
                  { term: { type: 'cases-comments' } },
                  { term: { 'cases-comments.owner': owner } },
                ],
                must: [
                  {
                    bool: {
                      should: [
                        { term: { 'cases-comments.type': 'externalReference' } },
                        { term: { 'cases-comments.type': 'alert' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

// ---- Synchronization source queries ----

export const getCasesSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    filter: getCasesSourceQuery(spaceId, owner)?.bool?.filter ?? [],
    must: [
      {
        bool: {
          should: [
            { range: { 'cases.created_at': { gte: lastSyncAt.toISOString() } } },
            { range: { 'cases.updated_at': { gte: lastSyncAt.toISOString() } } },
          ],
        },
      },
    ],
  },
});

export const getCommentsSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    filter: getCommentsSourceQuery(spaceId, owner)?.bool?.filter ?? [],
    must: [
      {
        bool: {
          should: [
            { range: { 'cases-comments.created_at': { gte: lastSyncAt.toISOString() } } },
            { range: { 'cases-comments.updated_at': { gte: lastSyncAt.toISOString() } } },
          ],
        },
      },
    ],
  },
});

export const getAttachmentsSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => {
  const baseQuery = getAttachmentsSourceQuery(spaceId, owner) as {
    bool: { filter: QueryDslQueryContainer[]; must: QueryDslQueryContainer[] };
  };
  return {
    bool: {
      filter: baseQuery.bool.filter,
      must: [
        ...baseQuery.bool.must,
        {
          bool: {
            should: [
              { range: { 'cases-comments.created_at': { gte: lastSyncAt.toISOString() } } },
              { range: { 'cases-comments.updated_at': { gte: lastSyncAt.toISOString() } } },
            ],
          },
        },
      ],
    },
  };
};

export const getContentSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    filter: [{ term: { namespaces: spaceId } }],
    must: [
      {
        bool: {
          should: [
            // recently changed cases
            {
              bool: {
                filter: [{ term: { type: 'cases' } }, { term: { 'cases.owner': owner } }],
                must: [
                  {
                    bool: {
                      should: [
                        { range: { 'cases.created_at': { gte: lastSyncAt.toISOString() } } },
                        { range: { 'cases.updated_at': { gte: lastSyncAt.toISOString() } } },
                      ],
                    },
                  },
                ],
              },
            },
            // recently changed comments
            {
              bool: {
                filter: [
                  { term: { type: 'cases-comments' } },
                  { term: { 'cases-comments.type': 'user' } },
                  { term: { 'cases-comments.owner': owner } },
                ],
                must: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            'cases-comments.created_at': { gte: lastSyncAt.toISOString() },
                          },
                        },
                        {
                          range: {
                            'cases-comments.updated_at': { gte: lastSyncAt.toISOString() },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            // recently changed attachments
            {
              bool: {
                filter: [
                  { term: { type: 'cases-comments' } },
                  { term: { 'cases-comments.owner': owner } },
                ],
                must: [
                  {
                    bool: {
                      should: [
                        { term: { 'cases-comments.type': 'externalReference' } },
                        { term: { 'cases-comments.type': 'alert' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            'cases-comments.created_at': { gte: lastSyncAt.toISOString() },
                          },
                        },
                        {
                          range: {
                            'cases-comments.updated_at': { gte: lastSyncAt.toISOString() },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

// ---- Backfill task ID ----

const CAI_CONTENT_BACKFILL_TASK_ID = 'cai_content_backfill_task';
export const getCAIContentBackfillTaskId = (spaceId: string, owner: Owner): string => {
  return `${CAI_CONTENT_BACKFILL_TASK_ID}-${owner}-${spaceId}`;
};
