/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import type {
  ISavedObjectsSerializer,
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_BULK_CREATE_OBSERVABLES,
} from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { CASE_REF_NAME } from '../../common/constants';
import type { ObservablePersistedAttributes } from '../../common/types/observable';
import type { User } from '../../common/types/user';
import { deleteObservablesOfCases } from './delete_for_cases';

/** Largest page a single search reads when it walks every observable of a case. */
const SCAN_PAGE_SIZE = 5_000;

export type ObservableSortField = 'createdAt' | 'value' | 'typeKey';
export type ObservableSortOrder = 'asc' | 'desc';
export type ObservableSortValues = Array<string | number>;

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
  /** The case's oldest objects, in created order. */
  oldest: Observable[];
}

export interface SharedObservables {
  total: number;
  observables: Observable[];
}

export interface ObservablesPageItem {
  observable: Observable;
  sort: ObservableSortValues;
}

export interface FindObservablesPageArgs {
  caseId: string;
  perPage: number;
  searchAfter?: ObservableSortValues;
  sortField: ObservableSortField;
  sortOrder: ObservableSortOrder;
  typeKeys?: string[];
  search?: string;
}

interface ObservableServiceContext {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  savedObjectsSerializer: ISavedObjectsSerializer;
  /** The namespace of the request's space; every search runs in it. */
  namespace: string;
  /** Schedules the background deletion of deleted cases' observables, when Task Manager runs. */
  scheduleCaseObservablesDeletion?: (params: {
    caseIds: string[];
    namespace: string;
  }) => Promise<void>;
}

interface CaseIdBucket {
  key: string;
  doc_count: number;
}

interface CaseIdsAggs {
  refs: { cases: { caseIds: { buckets: CaseIdBucket[] } } };
}

interface CaseHitsBucket extends CaseIdBucket {
  reverse: { doc_count: number; hits?: { hits: { hits: SavedObjectsRawDoc[] } } };
}

interface CaseHitsAggs {
  refs: { cases: { caseIds: { buckets: CaseHitsBucket[] } } };
}

/** The raw field of an observable attribute, as Elasticsearch sees it. */
export const observableField = (name: string): string => `${CASE_OBSERVABLE_SAVED_OBJECT}.${name}`;

const SORT_FIELDS: Readonly<Record<ObservableSortField, string>> = {
  createdAt: observableField('created_at'),
  value: observableField('value'),
  typeKey: observableField('type_key'),
};

/**
 * Tie-breakers after the requested sort field. Type key and value are unique within a case (a rare
 * repeat added at the same moment aside), so the full sort orders a case's observables totally.
 * Elasticsearch cannot sort on `_id`.
 */
const TIE_BREAKERS: Readonly<Record<ObservableSortField, ObservableSortField[]>> = {
  createdAt: ['typeKey', 'value'],
  value: ['typeKey'],
  typeKey: ['value'],
};

/** The fields a page of observables is sorted by, the requested one first. */
export const getObservableSortFields = (sortField: ObservableSortField): ObservableSortField[] => [
  sortField,
  ...TIE_BREAKERS[sortField],
];

const buildSort = (
  sortField: ObservableSortField,
  sortOrder: ObservableSortOrder
): estypes.Sort => [
  { [SORT_FIELDS[sortField]]: { order: sortOrder } },
  ...TIE_BREAKERS[sortField].map((tieBreaker) => ({
    [SORT_FIELDS[tieBreaker]]: { order: 'asc' as const },
  })),
];

const OLDEST_FIRST: estypes.Sort = buildSort('createdAt', 'asc');

export const buildCaseReferences = (caseId: string): SavedObjectReference[] => [
  { type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: caseId },
];

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

/** Groups observable values by type key, dropping repeats. */
export const groupValuesByTypeKey = (keys: ObservableKey[]): Map<string, string[]> => {
  const byType = new Map<string, Set<string>>();
  for (const { typeKey, value } of keys) {
    const values = byType.get(typeKey) ?? new Set<string>();
    values.add(value);
    byType.set(typeKey, values);
  }
  return new Map([...byType].map(([typeKey, values]) => [typeKey, [...values]]));
};

/** Matches the observables that reference any of the cases. */
export const caseReferenceQuery = (caseIds: string[]): estypes.QueryDslQueryContainer => ({
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
export const keysQuery = (keys: ObservableKey[]): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [...groupValuesByTypeKey(keys)].map(([typeKey, values]) => ({
      bool: {
        filter: [
          { term: { [observableField('type_key')]: typeKey } },
          { terms: { [observableField('value')]: values } },
        ],
      },
    })),
    minimum_should_match: 1,
  },
});

const ownersQuery = (owners?: string[]): estypes.QueryDslQueryContainer[] =>
  owners != null && owners.length > 0 ? [{ terms: { [observableField('owner')]: owners } }] : [];

/** Groups matching observables by the case they reference. */
const caseIdsAggs = (
  terms: estypes.AggregationsTermsAggregation,
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>
): Record<string, estypes.AggregationsAggregationContainer> => ({
  refs: {
    nested: { path: 'references' },
    aggregations: {
      cases: {
        filter: { term: { 'references.type': CASE_SAVED_OBJECT } },
        aggregations: {
          caseIds: {
            terms: { field: 'references.id', ...terms },
            ...(aggregations != null && { aggregations }),
          },
        },
      },
    },
  },
});

const reverseHitsAggs = (
  size: number,
  sort: estypes.Sort = OLDEST_FIRST
): Record<string, estypes.AggregationsAggregationContainer> => ({
  reverse: {
    reverse_nested: {},
    ...(size > 0 && { aggregations: { hits: { top_hits: { size, sort } } } }),
  },
});

const getTotal = (total: estypes.SearchTotalHits | number | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

/**
 * Reads and writes `cases-observables` objects. Every search runs in the request's space; callers
 * authorize the case before they reach the service.
 */
export class ObservableService {
  constructor(private readonly context: ObservableServiceContext) {}

  private async search<A = unknown>(request: Omit<estypes.SearchRequest, 'index'>) {
    return this.context.unsecuredSavedObjectsClient.search<SavedObjectsRawDocSource, A>({
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

  /**
   * Creates observables under the ids the caller assigned. A 409 means an earlier attempt of the
   * same request already created that id, so the observable counts as created.
   */
  public async bulkCreate({
    caseId,
    owner,
    observables,
    user,
    sourceAttachmentId = null,
  }: {
    caseId: string;
    owner: string;
    observables: ObservableToCreate[];
    user: User;
    sourceAttachmentId?: string | null;
  }): Promise<Observable[]> {
    const references = buildCaseReferences(caseId);
    const created: Observable[] = [];

    for (const observablesChunk of chunk(observables, MAX_BULK_CREATE_OBSERVABLES)) {
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
              source_attachment_id: sourceAttachmentId,
              created_at: createdAt,
              created_by: user,
              updated_at: null,
              updated_by: null,
            },
            references,
          })),
          { refresh: 'wait_for' }
        );

      const failures: string[] = [];
      results.forEach((result, index) => {
        if (!isSavedObjectErrorResult(result) || result.error.statusCode === 409) {
          const { id, typeKey, value, description, createdAt } = observablesChunk[index];
          created.push({ id, typeKey, value, description, createdAt, updatedAt: null });
        } else {
          failures.push(`${result.id}: ${result.error.message}`);
        }
      });

      if (failures.length > 0) {
        throw Boom.internal(
          `Failed to create ${failures.length} observables on case ${caseId}: ${failures.join(
            '; '
          )}`
        );
      }
    }

    return created;
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

    const { saved_objects: savedObjects } =
      await this.context.unsecuredSavedObjectsClient.bulkGet<ObservablePersistedAttributes>(
        ids.map((id) => ({ id, type: CASE_OBSERVABLE_SAVED_OBJECT }))
      );

    const found: Array<SavedObject<ObservablePersistedAttributes>> = [];
    const missingIds: string[] = [];

    savedObjects.forEach((savedObject, index) => {
      const belongsToCase =
        !isSavedObjectErrorResult(savedObject) &&
        savedObject.references.some(({ type, id }) => type === CASE_SAVED_OBJECT && id === caseId);

      if (belongsToCase) {
        found.push(savedObject);
      } else {
        missingIds.push(ids[index]);
      }
    });

    return { found, missingIds };
  }

  public async update({
    id,
    attributes,
    version,
  }: {
    id: string;
    attributes: Partial<ObservablePersistedAttributes>;
    version?: string;
  }): Promise<void> {
    await this.context.unsecuredSavedObjectsClient.update<ObservablePersistedAttributes>(
      CASE_OBSERVABLE_SAVED_OBJECT,
      id,
      attributes,
      { version, refresh: 'wait_for' }
    );
  }

  /** Deletes observables by id. Ids that are already gone are not an error. */
  public async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const { statuses } = await this.context.unsecuredSavedObjectsClient.bulkDelete(
      ids.map((id) => ({ type: CASE_OBSERVABLE_SAVED_OBJECT, id })),
      { refresh: 'wait_for' }
    );

    const failures = statuses.filter(({ success, error }) => !success && error?.statusCode !== 404);
    if (failures.length > 0) {
      throw Boom.internal(
        `Failed to delete ${failures.length} observables: ${failures
          .map(({ id, error }) => `${id}: ${error?.message}`)
          .join('; ')}`
      );
    }
  }

  /**
   * Deletes the observables of deleted cases. A background task deletes them a page at a time;
   * without Task Manager, or when scheduling fails, they are deleted before the call returns.
   */
  public async deleteForCases(caseIds: string[]): Promise<void> {
    if (caseIds.length === 0) {
      return;
    }

    const { log, namespace, scheduleCaseObservablesDeletion, unsecuredSavedObjectsClient } =
      this.context;

    if (scheduleCaseObservablesDeletion) {
      try {
        await scheduleCaseObservablesDeletion({ caseIds, namespace });
        return;
      } catch (error) {
        log.warn(
          `Failed to schedule the deletion of the observables of cases [${caseIds.join(
            ', '
          )}], deleting them now: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    await deleteObservablesOfCases({
      savedObjectsClient: unsecuredSavedObjectsClient,
      caseIds,
      namespace,
      logger: log,
    });
  }

  public async countForCase(caseId: string): Promise<number> {
    const response = await this.search({
      size: 0,
      track_total_hits: true,
      query: { bool: { filter: [caseReferenceQuery([caseId])] } },
    });
    return getTotal(response.hits.total);
  }

  /** The observables of a case that match any of the type keys and values, in one search. */
  public async findExisting(caseId: string, keys: ObservableKey[]): Promise<Observable[]> {
    if (keys.length === 0) {
      return [];
    }

    const existing: Observable[] = [];
    for (const keysChunk of chunk(keys, SCAN_PAGE_SIZE)) {
      const response = await this.search({
        size: keysChunk.length,
        query: { bool: { filter: [caseReferenceQuery([caseId]), keysQuery(keysChunk)] } },
      });
      existing.push(...response.hits.hits.map((hit) => this.toObservableFromRaw(hit)));
    }
    return existing;
  }

  /** One page of a case's observables with `search_after` paging. */
  public async findPage({
    caseId,
    perPage,
    searchAfter,
    sortField,
    sortOrder,
    typeKeys,
    search,
  }: FindObservablesPageArgs): Promise<{ items: ObservablesPageItem[]; total: number }> {
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
        sort: (hit.sort ?? []) as ObservableSortValues,
      })),
      total: getTotal(response.hits.total),
    };
  }

  /** Every observable of a case, oldest first. A case holds at most about 10,000. */
  public async getAllForCase(caseId: string): Promise<Observable[]> {
    const observables: Observable[] = [];
    let searchAfter: estypes.SortResults | undefined;

    do {
      const response = await this.search({
        size: SCAN_PAGE_SIZE,
        sort: OLDEST_FIRST,
        ...(searchAfter != null && { search_after: searchAfter }),
        query: { bool: { filter: [caseReferenceQuery([caseId])] } },
      });
      const { hits } = response.hits;
      observables.push(...hits.map((hit) => this.toObservableFromRaw(hit)));
      searchAfter = hits.length === SCAN_PAGE_SIZE ? hits[hits.length - 1].sort : undefined;
    } while (searchAfter != null);

    return observables;
  }

  /**
   * For each case, the count of its objects and its oldest objects, in one aggregation for every
   * case of the request. `previewSize` 0 returns counts only.
   */
  public async getPreviews(
    caseIds: string[],
    previewSize: number
  ): Promise<Map<string, ObservablesPreview>> {
    const previews = new Map<string, ObservablesPreview>();
    if (caseIds.length === 0) {
      return previews;
    }

    const response = await this.search<CaseHitsAggs>({
      size: 0,
      query: { bool: { filter: [caseReferenceQuery(caseIds)] } },
      aggs: caseIdsAggs({ size: caseIds.length, include: caseIds }, reverseHitsAggs(previewSize)),
    });

    for (const bucket of response.aggregations?.refs.cases.caseIds.buckets ?? []) {
      previews.set(bucket.key, {
        count: bucket.reverse.doc_count,
        oldest: (bucket.reverse.hits?.hits.hits ?? []).map((hit) => this.toObservableFromRaw(hit)),
      });
    }

    return previews;
  }

  /** Ids of the cases holding an observable whose value starts with the prefix, ignoring case. */
  public async findCaseIdsByValuePrefix({
    prefix,
    owners,
    size,
  }: {
    prefix: string;
    owners?: string[];
    size: number;
  }): Promise<string[]> {
    const response = await this.search<CaseIdsAggs>({
      size: 0,
      query: {
        bool: {
          filter: [
            { prefix: { [observableField('value')]: { value: prefix, case_insensitive: true } } },
            ...ownersQuery(owners),
          ],
        },
      },
      aggs: caseIdsAggs({ size }),
    });

    return (response.aggregations?.refs.cases.caseIds.buckets ?? []).map(({ key }) => key);
  }

  /**
   * Cases, other than the source case, that hold any of the keys, with how many of them each
   * holds, most first.
   */
  public async findSimilarCandidates({
    excludeCaseId,
    keys,
    owners,
    size,
  }: {
    excludeCaseId: string;
    keys: ObservableKey[];
    owners?: string[];
    size: number;
  }): Promise<Array<{ caseId: string; sharedCount: number }>> {
    if (keys.length === 0) {
      return [];
    }

    const response = await this.search<CaseIdsAggs>({
      size: 0,
      query: {
        bool: {
          filter: [keysQuery(keys), ...ownersQuery(owners)],
          must_not: [caseReferenceQuery([excludeCaseId])],
        },
      },
      aggs: caseIdsAggs({ size }),
    });

    return (response.aggregations?.refs.cases.caseIds.buckets ?? []).map(
      ({ key, doc_count: sharedCount }) => ({ caseId: key, sharedCount })
    );
  }

  /** For each case, how many of its objects match the keys, and the oldest of them. */
  public async getSharedForCases({
    caseIds,
    keys,
    size,
  }: {
    caseIds: string[];
    keys: ObservableKey[];
    size: number;
  }): Promise<Map<string, SharedObservables>> {
    const shared = new Map<string, SharedObservables>();
    if (caseIds.length === 0 || keys.length === 0) {
      return shared;
    }

    const response = await this.search<CaseHitsAggs>({
      size: 0,
      query: { bool: { filter: [caseReferenceQuery(caseIds), keysQuery(keys)] } },
      aggs: caseIdsAggs({ size: caseIds.length, include: caseIds }, reverseHitsAggs(size)),
    });

    for (const bucket of response.aggregations?.refs.cases.caseIds.buckets ?? []) {
      shared.set(bucket.key, {
        total: bucket.reverse.doc_count,
        observables: (bucket.reverse.hits?.hits.hits ?? []).map((hit) =>
          this.toObservableFromRaw(hit)
        ),
      });
    }

    return shared;
  }
}
