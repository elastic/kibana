/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const CAI_CASES_INDEX_NAME = '.internal.cases';

export const CAI_CASES_INDEX_ALIAS = '.cases';

export const CAI_CASES_INDEX_VERSION = 1;

export const CAI_CASES_SOURCE_QUERY: QueryDslQueryContainer = {
  term: {
    type: 'cases',
  },
};

export const CAI_CASES_SOURCE_INDEX = ALERTING_CASES_SAVED_OBJECT_INDEX;

export const CAI_CASES_BACKFILL_TASK_ID = 'cai_cases_backfill_task';

export const CAI_CASES_SYNCHRONIZATION_TASK_ID = 'cai_cases_synchronization_task';

export const getCasesSynchronizationSourceQuery = (lastSyncAt: Date): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        term: {
          type: 'cases',
        },
      },
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
