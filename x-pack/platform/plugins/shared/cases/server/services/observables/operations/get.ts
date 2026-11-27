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
  CaseWithFieldObservables,
  FindObservablesPageArgs,
  GetObservablesPreviewsOptions,
  ObservableKey,
  ObservableServiceContext,
  ObservablesPageItem,
  ObservablesPreview,
} from '../types';
import type { PreviewAggregations } from '../utils';
import {
  buildPreviewAggregations,
  buildSort,
  caseObservablesQuery,
  getPreviewSize,
  getTotal,
  keysQuery,
  logged,
  observableField,
  OLDEST_FIRST,
  throwOnErrors,
  toObservable,
} from '../utils';

/** Hits one search reads when it walks every match. */
const SCAN_PAGE_SIZE = 5_000;

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
        query: caseObservablesQuery([caseId]),
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
        const query = caseObservablesQuery([caseId], [keysQuery(keys)]);
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
        const filters: estypes.QueryDslQueryContainer[] = [];

        if (typeKeys != null && typeKeys.length > 0) {
          filters.push({ terms: { [observableField('type_key')]: typeKeys } });
        }

        if (search != null && search.length > 0) {
          filters.push({
            prefix: { [observableField('value')]: { value: search, case_insensitive: true } },
          });
        }

        const response = await this.search({
          size: perPage,
          track_total_hits: true,
          sort: buildSort(sortField, sortOrder),
          ...(searchAfter != null && { search_after: searchAfter }),
          query: caseObservablesQuery([caseId], filters),
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
   * For each case, how many objects it holds and enough of its oldest to fill its response to 50
   * observables after the ones in its field, in one search for every case. The search reads as many
   * as the case with the most room needs, and none when every field is full. Cases without objects
   * are left out.
   */
  public async getPreviews(
    cases: CaseWithFieldObservables[],
    { ignoreErrors = false }: GetObservablesPreviewsOptions = {}
  ): Promise<Map<string, ObservablesPreview>> {
    const previews = new Map<string, ObservablesPreview>();
    const uniqueCaseIds = [...new Set(cases.map(({ id }) => id))];

    if (uniqueCaseIds.length === 0) {
      return previews;
    }

    const previewSize = getPreviewSize(cases);

    const search = logged(
      this.context.log,
      `get the observables previews of ${uniqueCaseIds.length} cases`,
      async () => {
        const response = await this.search<PreviewAggregations>({
          size: 0,
          query: caseObservablesQuery(uniqueCaseIds),
          aggs: buildPreviewAggregations(uniqueCaseIds, previewSize),
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

    return ignoreErrors ? search.catch(() => new Map<string, ObservablesPreview>()) : search;
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
