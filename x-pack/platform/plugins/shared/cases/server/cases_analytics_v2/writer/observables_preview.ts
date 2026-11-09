/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObject } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
} from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { ObservablePersistedAttributes } from '../../common/types/observable';

interface PreviewAggs {
  refs: {
    cases: {
      caseIds: {
        buckets: Array<{
          key: string;
          reverse: {
            oldest: {
              hits: {
                hits: Array<{
                  _id?: string;
                  _source?: { [CASE_OBSERVABLE_SAVED_OBJECT]?: ObservablePersistedAttributes };
                }>;
              };
            };
          };
        }>;
      };
    };
  };
}

const RAW_ID_PREFIX = `${CASE_OBSERVABLE_SAVED_OBJECT}:`;

/**
 * The oldest `cases-observables` objects of each case that has room in its preview, read straight
 * from the saved-objects index, so the analytics case document carries the same observables as
 * case responses: the case field first, then the oldest of the type, up to 50.
 */
export const fetchObservablesPreviews = async (
  esClient: ElasticsearchClient,
  sos: Array<SavedObject<CasePersistedAttributes>>
): Promise<Map<string, Observable[]>> => {
  const previews = new Map<string, Observable[]>();
  const caseIds = sos
    .filter(({ attributes }) => (attributes.observables ?? []).length < MAX_OBSERVABLES_PER_CASE)
    .map(({ id }) => id);

  if (caseIds.length === 0) {
    return previews;
  }

  const response = await esClient.search<unknown, PreviewAggs>({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { type: CASE_OBSERVABLE_SAVED_OBJECT } },
          {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: [
                    { term: { 'references.type': CASE_SAVED_OBJECT } },
                    { terms: { 'references.id': caseIds } },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    aggs: {
      refs: {
        nested: { path: 'references' },
        aggs: {
          cases: {
            filter: { term: { 'references.type': CASE_SAVED_OBJECT } },
            aggs: {
              caseIds: {
                terms: { field: 'references.id', size: caseIds.length, include: caseIds },
                aggs: {
                  reverse: {
                    reverse_nested: {},
                    aggs: {
                      oldest: {
                        top_hits: {
                          size: MAX_OBSERVABLES_PER_CASE,
                          sort: [
                            { [`${CASE_OBSERVABLE_SAVED_OBJECT}.created_at`]: { order: 'asc' } },
                            { [`${CASE_OBSERVABLE_SAVED_OBJECT}.type_key`]: { order: 'asc' } },
                            { [`${CASE_OBSERVABLE_SAVED_OBJECT}.value`]: { order: 'asc' } },
                          ],
                          _source: [CASE_OBSERVABLE_SAVED_OBJECT],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  for (const bucket of response.aggregations?.refs.cases.caseIds.buckets ?? []) {
    previews.set(
      bucket.key,
      bucket.reverse.oldest.hits.hits.flatMap(({ _id: rawId, _source: source }) => {
        const attributes = source?.[CASE_OBSERVABLE_SAVED_OBJECT];
        if (!rawId?.startsWith(RAW_ID_PREFIX) || attributes == null) {
          return [];
        }
        return [
          {
            id: rawId.slice(RAW_ID_PREFIX.length),
            typeKey: attributes.type_key,
            value: attributes.value,
            description: attributes.description ?? null,
            createdAt: attributes.created_at,
            updatedAt: attributes.updated_at ?? null,
          },
        ];
      })
    );
  }

  return previews;
};
