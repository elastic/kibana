/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const CAI_ACTIVITY_INDEX_NAME = '.internal.cases-activity';

export const CAI_ACTIVITY_INDEX_ALIAS = '.cases-activity';

export const CAI_ACTIVITY_INDEX_VERSION = 1;

export const CAI_ACTIVITY_SOURCE_QUERY: QueryDslQueryContainer = {
  bool: {
    must: [
      {
        term: {
          type: 'cases-user-actions',
        },
      },
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
};

export const CAI_ACTIVITY_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

export const CAI_ACTIVITY_BACKFILL_TASK_ID = 'cai_activity_backfill_task';

export const CAI_ACTIVITY_SYNCHRONIZATION_TASK_ID = 'cai_cases_activity_synchronization_task';

export const getActivitySynchronizationSourceQuery = (
  lastSyncAt: Date
): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        term: {
          type: 'cases-user-actions',
        },
      },
      {
        range: {
          'cases-user-actions.created_at': {
            gte: lastSyncAt.toISOString(),
          },
        },
      },
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
