/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObject, SavedObjectsRawDoc, SavedObjectsRawDocSource } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { Observable } from '../../../../common/types/domain';
import type { ObservablePersistedAttributes } from '../../../common/types/observable';
import type {
  FindObservablesPageArgs,
  ObservableKey,
  ObservableServiceContext,
  ObservableSortField,
  ObservablesPageItem,
  ObservablesPreview,
} from '../types';
import { logged, throwOnErrors } from '../utils';

/** Hits one search reads when it walks every match. */
const SCAN_PAGE_SIZE = 5_000;

interface PreviewAggregations {
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

const observableField = (name: keyof ObservablePersistedAttributes): string =>
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

const buildSort = (
  sortField: ObservableSortField,
  sortOrder: estypes.SortOrder
): estypes.SortCombinations[] => [
  { [SORT_FIELDS[sortField]]: { order: sortOrder } },
  ...TIE_BREAKERS[sortField].map((tieBreaker) => ({
    [SORT_FIELDS[tieBreaker]]: { order: 'asc' as const },
  })),
];

const OLDEST_FIRST = buildSort('createdAt', 'asc');

const caseReferenceQuery = (caseIds: string[]): estypes.QueryDslQueryContainer => ({
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
});

/**
 * One clause per type key holding its values as a set, so the clause count follows the number of
 * types, not the number of observables, and stays far below Elasticsearch's clause limit.
 */
const keysQuery = (keys: ObservableKey[]): estypes.QueryDslQueryContainer => {
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

const getTotal = (total: estypes.SearchTotalHits | number | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

const toObservable = ({
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

/** Reads `cases-observables` objects. Searches run in the request's space. */
export class ObservableGetter {
  constructor(private readonly context: ObservableServiceContext) {}

  /** Gets observables by id, keeping only the ones that belong to the case. */
  public async getForCase(
    caseId: string,
    ids: string[]
  ): Promise<{
    found: Array<SavedObject<ObservablePersistedAttributes>>;
    missingIds: string[];
  }> {
    if (ids.length === 0) {
      return { found: [], missingIds: [] };
    }

    return logged(this.context.log, `get ${ids.length} observables of case ${caseId}`, async () => {
      const { saved_objects: savedObjects } =
        await this.context.unsecuredSavedObjectsClient.bulkGet<ObservablePersistedAttributes>(
          ids.map((id) => ({ id, type: CASE_OBSERVABLE_SAVED_OBJECT }))
        );

      throwOnErrors('get', savedObjects, 404);

      const found = savedObjects.filter(
        (savedObject): savedObject is SavedObject<ObservablePersistedAttributes> =>
          !isSavedObjectErrorResult(savedObject) &&
          savedObject.references.some(({ type, id }) => type === CASE_SAVED_OBJECT && id === caseId)
      );
      const foundIds = new Set(found.map(({ id }) => id));

      return { found, missingIds: ids.filter((id) => !foundIds.has(id)) };
    });
  }

  public async countForCase(caseId: string): Promise<number> {
    return logged(this.context.log, `count the observables of case ${caseId}`, async () => {
      const response = await this.search({
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: [caseReferenceQuery([caseId])] } },
      });

      return getTotal(response.hits.total);
    });
  }

  /**
   * The observables of a case with any of the type keys and values, oldest first. A repeat of a
   * key added at the same moment can come back once instead of twice.
   */
  public async findExisting(caseId: string, keys: ObservableKey[]): Promise<Observable[]> {
    if (keys.length === 0) {
      return [];
    }

    return logged(
      this.context.log,
      `find observables of case ${caseId} matching ${keys.length} type keys and values`,
      async () => {
        const query = { bool: { filter: [caseReferenceQuery([caseId]), keysQuery(keys)] } };
        const existing: Observable[] = [];
        let searchAfter: estypes.SortResults | undefined;

        do {
          const response = await this.search({
            size: SCAN_PAGE_SIZE,
            sort: OLDEST_FIRST,
            ...(searchAfter != null && { search_after: searchAfter }),
            query,
          });

          const { hits } = response.hits;
          existing.push(...hits.map((hit) => this.toObservableFromRaw(hit)));
          searchAfter = hits.length === SCAN_PAGE_SIZE ? hits[hits.length - 1].sort : undefined;
        } while (searchAfter != null);

        return existing;
      }
    );
  }

  /** One page of a case's observables, paged with `search_after`. */
  public async findPage({
    caseId,
    perPage,
    searchAfter,
    sortField,
    sortOrder,
    typeKeys,
    search,
  }: FindObservablesPageArgs): Promise<{ items: ObservablesPageItem[]; total: number }> {
    return logged(
      this.context.log,
      `find a page of the observables of case ${caseId}`,
      async () => {
        const filter: estypes.QueryDslQueryContainer[] = [caseReferenceQuery([caseId])];

        if (typeKeys != null && typeKeys.length > 0) {
          filter.push({ terms: { [observableField('type_key')]: typeKeys } });
        }

        if (search != null && search.length > 0) {
          filter.push({
            prefix: { [observableField('value')]: { value: search, case_insensitive: true } },
          });
        }

        const response = await this.search({
          size: perPage,
          track_total_hits: true,
          sort: buildSort(sortField, sortOrder),
          ...(searchAfter != null && { search_after: searchAfter }),
          query: { bool: { filter } },
        });

        return {
          items: response.hits.hits.map((hit) => ({
            observable: this.toObservableFromRaw(hit),
            sort: hit.sort ?? [],
          })),
          total: getTotal(response.hits.total),
        };
      }
    );
  }

  /**
   * For each case, how many objects it holds and its oldest `previewSize` of them, in one search
   * for every case. Cases without objects are left out. `previewSize` 0 returns counts only; it
   * must not exceed the index's `max_inner_result_window` (100 by default).
   */
  public async getPreviews(
    caseIds: string[],
    previewSize: number
  ): Promise<Map<string, ObservablesPreview>> {
    const previews = new Map<string, ObservablesPreview>();
    const uniqueCaseIds = [...new Set(caseIds)];

    if (uniqueCaseIds.length === 0) {
      return previews;
    }

    return logged(
      this.context.log,
      `get the observables previews of ${uniqueCaseIds.length} cases`,
      async () => {
        const response = await this.search<PreviewAggregations>({
          size: 0,
          query: { bool: { filter: [caseReferenceQuery(uniqueCaseIds)] } },
          aggs: {
            refs: {
              nested: { path: 'references' },
              aggs: {
                cases: {
                  filter: { term: { 'references.type': CASE_SAVED_OBJECT } },
                  aggs: {
                    caseIds: {
                      terms: {
                        field: 'references.id',
                        size: uniqueCaseIds.length,
                        include: uniqueCaseIds,
                      },
                      aggs: {
                        reverse: {
                          reverse_nested: {},
                          ...(previewSize > 0 && {
                            aggs: {
                              oldest: { top_hits: { size: previewSize, sort: OLDEST_FIRST } },
                            },
                          }),
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        for (const { key, reverse } of response.aggregations?.refs.cases.caseIds.buckets ?? []) {
          previews.set(key, {
            count: reverse.doc_count,
            oldest: (reverse.oldest?.hits.hits ?? []).map((hit) => this.toObservableFromRaw(hit)),
          });
        }

        return previews;
      }
    );
  }

  private async search<Aggregations = unknown>(
    request: Omit<estypes.SearchRequest, 'index'>
  ): Promise<estypes.SearchResponse<SavedObjectsRawDocSource, Aggregations>> {
    return this.context.unsecuredSavedObjectsClient.search<SavedObjectsRawDocSource, Aggregations>({
      type: CASE_OBSERVABLE_SAVED_OBJECT,
      namespaces: [this.context.namespace],
      ...request,
    });
  }

  private toObservableFromRaw(
    hit: estypes.SearchHit<SavedObjectsRawDocSource> | SavedObjectsRawDoc
  ): Observable {
    return toObservable(
      this.context.savedObjectsSerializer.rawToSavedObject<ObservablePersistedAttributes>(
        hit as SavedObjectsRawDoc
      )
    );
  }
}
