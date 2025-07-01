/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const CAI_ATTACHMENTS_INDEX_NAME = '.internal.cases-attachments';

export const CAI_ATTACHMENTS_INDEX_ALIAS = '.cases-attachments';

export const CAI_ATTACHMENTS_INDEX_VERSION = 1;

export const CAI_ATTACHMENTS_SOURCE_QUERY: QueryDslQueryContainer = {
  bool: {
    must: [
      {
        term: {
          type: 'cases-comments',
        },
      },
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
};

export const CAI_ATTACHMENTS_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

export const CAI_ATTACHMENTS_BACKFILL_TASK_ID = 'cai_attachments_backfill_task';

export const CAI_ATTACHMENTS_SYNCHRONIZATION_TASK_ID = 'cai_cases_attachments_synchronization_task';

export const getAttachmentsSynchronizationSourceQuery = (
  lastSyncAt: Date
): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        term: {
          type: 'cases-comments',
        },
      },
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
