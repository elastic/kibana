/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import type { Logger, SavedObject, SavedObjectsRawDoc } from '@kbn/core/server';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
} from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import type { ObservablePersistedAttributes } from '../../common/types/observable';
import type { CaseWithFieldObservables, ObservableKey, ObservableSortField } from './types';

/** Throws one error listing every per-object failure other than `toleratedStatusCode`. */
export const throwOnErrors = (
  action: string,
  results: Array<{ id: string; error?: { statusCode: number; message: string } }>,
  toleratedStatusCode: number
): void => {
  const failures = results.filter(
    ({ error }) => error != null && error.statusCode !== toleratedStatusCode
  );

  if (failures.length > 0) {
    throw Boom.internal(
      `Failed to ${action} ${failures.length} observables: ${failures
        .map(({ id, error }) => `${id}: ${error?.message}`)
        .join('; ')}`
    );
  }
};

/** Runs `operation`, logging the attempt at debug and a failure at error before rethrowing it. */
export const logged = async <T>(
  log: Logger,
  operation: string,
  run: () => Promise<T>
): Promise<T> => {
  try {
    log.debug(`Attempting to ${operation}`);
    return await run();
  } catch (error) {
    log.error(`Failed to ${operation}: ${error}`, { error });
    throw error;
  }
};

export const observableField = (name: keyof ObservablePersistedAttributes): string =>
  `${CASE_OBSERVABLE_SAVED_OBJECT}.${name}`;

const SORT_FIELDS: Readonly<Record<ObservableSortField, string>> = {
  createdAt: observableField('created_at'),
  value: observableField('value'),
  typeKey: observableField('type_key'),
};

/**
 * Tie-breakers after the requested sort field. A type key and value are unique within a case, a
 * repeat added at the same moment aside, so the sort orders a case's observables. Elasticsearch
 * cannot sort on `_id`.
 */
const TIE_BREAKERS: Readonly<Record<ObservableSortField, ObservableSortField[]>> = {
  createdAt: ['typeKey', 'value'],
  value: ['typeKey'],
  typeKey: ['value'],
};

export const buildSort = (
  sortField: ObservableSortField,
  sortOrder: estypes.SortOrder
): estypes.SortCombinations[] => [
  { [SORT_FIELDS[sortField]]: { order: sortOrder } },
  ...TIE_BREAKERS[sortField].map((tieBreaker) => ({
    [SORT_FIELDS[tieBreaker]]: { order: 'asc' as const },
  })),
];

export const OLDEST_FIRST = buildSort('createdAt', 'asc');

/** Matches the observables of the cases that also match every one of `filters`. */
export const caseObservablesQuery = (
  caseIds: string[],
  filters: estypes.QueryDslQueryContainer[] = []
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
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
      ...filters,
    ],
  },
});

/**
 * One clause per type key holding its values as a set, so the clause count follows the number of
 * types, not the number of observables, and stays far below Elasticsearch's clause limit.
 */
export const keysQuery = (keys: ObservableKey[]): estypes.QueryDslQueryContainer => {
  const valuesByTypeKey = new Map<string, Set<string>>();
  for (const { typeKey, value } of keys) {
    valuesByTypeKey.set(typeKey, (valuesByTypeKey.get(typeKey) ?? new Set()).add(value));
  }

  return {
    bool: {
      should: [...valuesByTypeKey].map(([typeKey, values]) => ({
        bool: {
          filter: [
            { term: { [observableField('type_key')]: typeKey } },
            { terms: { [observableField('value')]: [...values] } },
          ],
        },
      })),
      minimum_should_match: 1,
    },
  };
};

export interface PreviewAggregations {
  refs: {
    cases: {
      caseIds: {
        buckets: Array<{
          key: string;
          reverse: { doc_count: number; oldest?: { hits: { hits: SavedObjectsRawDoc[] } } };
        }>;
      };
    };
  };
}

/**
 * How many of their oldest objects the cases need to fill their responses to 50 observables after
 * the ones in their fields: the most room any case has left, so at most 50, which stays under the
 * index's `max_inner_result_window` (100 by default).
 */
export const getPreviewSize = (cases: CaseWithFieldObservables[]): number =>
  cases.reduce(
    (size, { observables }) => Math.max(size, MAX_OBSERVABLES_PER_CASE - observables.length),
    0
  );

/**
 * Buckets the objects by case, counting each case's objects and, unless `previewSize` is 0, keeping
 * its oldest `previewSize`, which must not exceed the index's `max_inner_result_window` (100 by
 * default).
 */
export const buildPreviewAggregations = (
  caseIds: string[],
  previewSize: number
): Record<string, estypes.AggregationsAggregationContainer> => ({
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
                ...(previewSize > 0 && {
                  aggs: { oldest: { top_hits: { size: previewSize, sort: OLDEST_FIRST } } },
                }),
              },
            },
          },
        },
      },
    },
  },
});

export const getTotal = (total: estypes.SearchTotalHits | number | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

export const toObservable = ({
  id,
  attributes,
}: Pick<SavedObject<ObservablePersistedAttributes>, 'id' | 'attributes'>): Observable => ({
  id,
  typeKey: attributes.type_key,
  value: attributes.value,
  description: attributes.description ?? null,
  createdAt: attributes.created_at,
  updatedAt: attributes.updated_at ?? null,
});
