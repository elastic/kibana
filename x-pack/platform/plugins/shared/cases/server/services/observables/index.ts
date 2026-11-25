/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { chunk } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type {
  ISavedObjectsSerializer,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { CASE_REF_NAME } from '../../common/constants';
import type { ObservablePersistedAttributes } from '../../common/types/observable';
import type { User } from '../../common/types/user';

/** Objects one bulk create request to Elasticsearch writes. */
const BULK_CREATE_CHUNK_SIZE = 1_000;
/** Hits one search reads when it walks every match. */
const SCAN_PAGE_SIZE = 5_000;

export type ObservableSortField = 'createdAt' | 'value' | 'typeKey';

export interface ObservableKey {
  typeKey: string;
  value: string;
}

export interface ObservableToCreate extends ObservableKey {
  id: string;
  description: string | null;
  createdAt: string;
}

export interface ObservablesPreview {
  /** How many `cases-observables` objects the case holds. */
  count: number;
  /** The case's oldest objects, oldest first. */
  oldest: Observable[];
}

export interface ObservablesPageItem {
  observable: Observable;
  /** The sort values of the item; pass the last item's as `searchAfter` to get the next page. */
  sort: estypes.SortResults;
}

export interface FindObservablesPageArgs {
  caseId: string;
  perPage: number;
  searchAfter?: estypes.SortResults;
  sortField: ObservableSortField;
  sortOrder: estypes.SortOrder;
  typeKeys?: string[];
  /** Matches values that start with it, ignoring case. */
  search?: string;
}

interface ObservableServiceContext {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  savedObjectsSerializer: ISavedObjectsSerializer;
  /** The namespace of the request's space; every search runs in it. */
  namespace: string;
}

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

/** Throws one error listing every per-object failure other than `toleratedStatusCode`. */
const throwOnErrors = (
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

/**
 * Reads and writes `cases-observables` objects, one per observable of a case. Searches run in the
 * request's space. The service does not authorize: callers authorize the case first.
 */
export class ObservableService {
  constructor(private readonly context: ObservableServiceContext) {}

  /**
   * Creates observables under the ids the caller assigned. A 409 means an earlier attempt of the
   * same request already created that id, so the observable counts as created.
   */
  public async bulkCreate({
    caseId,
    owner,
    observables,
    user,
  }: {
    caseId: string;
    owner: string;
    observables: ObservableToCreate[];
    user: User;
  }): Promise<Observable[]> {
    return this.logged(
      `bulk create ${observables.length} observables on case ${caseId}`,
      async () => {
        const references = [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: caseId }];
        const chunks = chunk(observables, BULK_CREATE_CHUNK_SIZE);

        for (const [chunkIndex, observablesChunk] of chunks.entries()) {
          const { saved_objects: results } =
            await this.context.unsecuredSavedObjectsClient.bulkCreate<ObservablePersistedAttributes>(
              observablesChunk.map(({ id, typeKey, value, description, createdAt }) => ({
                type: CASE_OBSERVABLE_SAVED_OBJECT,
                id,
                attributes: {
                  owner,
                  type_key: typeKey,
                  value,
                  description,
                  source_attachment_id: null,
                  created_at: createdAt,
                  created_by: user,
                  updated_at: null,
                  updated_by: null,
                },
                references,
              })),
              // Saved object indices have one shard, so the last chunk's refresh exposes every chunk.
              { refresh: chunkIndex === chunks.length - 1 ? 'wait_for' : false }
            );

          throwOnErrors('create', results, 409);
        }

        return observables.map(({ id, typeKey, value, description, createdAt }) => ({
          id,
          typeKey,
          value,
          description,
          createdAt,
          updatedAt: null,
        }));
      }
    );
  }

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

    return this.logged(`get ${ids.length} observables of case ${caseId}`, async () => {
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

  /**
   * Updates an observable `getForCase` returned, which checked it belongs to the case. Its version
   * makes a concurrent edit fail with a 409.
   */
  public async update({
    observable: { id, version },
    attributes,
  }: {
    observable: SavedObject<ObservablePersistedAttributes>;
    attributes: Partial<
      Pick<ObservablePersistedAttributes, 'value' | 'description' | 'updated_at' | 'updated_by'>
    >;
  }): Promise<void> {
    await this.logged(`update observable ${id}`, () =>
      this.context.unsecuredSavedObjectsClient.update<ObservablePersistedAttributes>(
        CASE_OBSERVABLE_SAVED_OBJECT,
        id,
        attributes,
        { version, refresh: 'wait_for' }
      )
    );
  }

  /**
   * Deletes observables `getForCase` returned, which checked they belong to the case. Ones that are
   * already gone are not an error.
   */
  public async bulkDelete(
    observables: Array<SavedObject<ObservablePersistedAttributes>>
  ): Promise<void> {
    if (observables.length === 0) {
      return;
    }

    await this.logged(`delete ${observables.length} observables`, async () => {
      const { statuses } = await this.context.unsecuredSavedObjectsClient.bulkDelete(
        observables.map(({ id }) => ({ type: CASE_OBSERVABLE_SAVED_OBJECT, id })),
        { refresh: 'wait_for' }
      );

      throwOnErrors('delete', statuses, 404);
    });
  }

  public async countForCase(caseId: string): Promise<number> {
    return this.logged(`count the observables of case ${caseId}`, async () => {
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

    return this.logged(
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
    return this.logged(`find a page of the observables of case ${caseId}`, async () => {
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
    });
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

    return this.logged(
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

  private async logged<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      this.context.log.debug(`Attempting to ${operation}`);
      return await run();
    } catch (error) {
      this.context.log.error(`Failed to ${operation}: ${error}`, { error });
      throw error;
    }
  }
}
