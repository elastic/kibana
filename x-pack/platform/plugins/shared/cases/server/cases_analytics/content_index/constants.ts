/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Owner } from '../../../common/constants/types';

// ---------------------------------------------------------------------------
// Content index (cases + comments + attachments merged into a single index)
// ---------------------------------------------------------------------------

export const CONTENT_INDEX_PREFIX = '.cases-analytics';

const CAI_CONTENT_INDEX_NAME_BASE = '.internal.cases-analytics';
export function getContentDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_CONTENT_INDEX_NAME_BASE}.${owner}-${spaceId}`.toLowerCase();
}

/** Public alias name — matches target index name from the spec. */
export function getContentIndexName(owner: string, spaceId: string): string {
  return `${CONTENT_INDEX_PREFIX}.${owner}-${spaceId}`.toLowerCase();
}

export const CAI_CONTENT_INDEX_VERSION = 1;

export const CAI_CONTENT_SYNC_TYPE = 'cai_content_sync';

export const CAI_CONTENT_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

const CAI_CONTENT_BACKFILL_TASK_ID = 'cai_content_backfill_task';
export const getCAIContentBackfillTaskId = (spaceId: string, owner: Owner): string =>
  `${CAI_CONTENT_BACKFILL_TASK_ID}-${owner}-${spaceId}`;

/**
 * Source query for the content index backfill. Selects all cases AND all
 * cases-comments (user comments, alert attachments, file attachments) for the
 * given owner and space.
 */
export const getContentSourceQuery = (spaceId: string, owner: Owner): QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { namespaces: spaceId } },
            { term: { 'cases.owner': owner } },
          ],
        },
      },
      {
        bool: {
          filter: [
            { term: { type: 'cases-comments' } },
            { term: { namespaces: spaceId } },
            { term: { 'cases-comments.owner': owner } },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

/**
 * Source query for the content index incremental synchronisation. Only
 * selects documents updated/created since lastSyncAt.
 */
export const getContentSynchronizationSourceQuery = (
  lastSyncAt: Date,
  spaceId: string,
  owner: Owner
): QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { namespaces: spaceId } },
            { term: { 'cases.owner': owner } },
          ],
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
      {
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
                  {
                    range: { 'cases-comments.created_at': { gte: lastSyncAt.toISOString() } },
                  },
                  {
                    range: { 'cases-comments.updated_at': { gte: lastSyncAt.toISOString() } },
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
});

// ---------------------------------------------------------------------------
// Activity index (user-action audit trail) — naming constants live here so
// that content_index/constants.ts is the single source of truth for the
// .cases-analytics* family of index names.
// ---------------------------------------------------------------------------

export const ACTIVITY_INDEX_PREFIX = '.cases-analytics-activity';

const CAI_ANALYTICS_ACTIVITY_INDEX_NAME_BASE = '.internal.cases-analytics-activity';
export function getAnalyticsActivityDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_ANALYTICS_ACTIVITY_INDEX_NAME_BASE}.${owner}-${spaceId}`.toLowerCase();
}

/** Public alias name for the activity index. */
export function getActivityIndexName(owner: string, spaceId: string): string {
  return `${ACTIVITY_INDEX_PREFIX}.${owner}-${spaceId}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// doc_type discriminator values
// ---------------------------------------------------------------------------

export const DOC_TYPES = {
  CASE: 'case',
  COMMENT: 'comment',
  ATTACHMENT: 'attachment',
} as const;

export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES];
