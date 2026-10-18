/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  MsearchRequestItem,
  QueryDslQueryContainer,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import { type Entity, type EntityType } from '../../../common';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';

const MAX_SEARCH_RESPONSE_SIZE = 10_000;

/** Matches asset criticality "deleted" sentinel used by Security Solution entity store. */
const ASSET_CRITICALITY_DELETED = 'deleted';

/**
 * Converts flat dotted keys (e.g. entity.name, entity.source) from entity store v2
 * ESQL columnar ingest into nested structure expected by the UI and Entity type.
 */
function normalizeFlatDottedKeysToNested(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      if (key.includes('.')) {
        set(result, key, value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

function buildNormalizedFields(obj: Record<string, unknown>, properties: string[]) {
  const hasObjVal = (p: string) =>
    obj[p] !== null && typeof obj[p] === 'object' && !Array.isArray(obj[p]);
  const entries = properties
    .filter(hasObjVal)
    .map((p) => [p, toLowercaseKeys(obj[p] as Record<string, unknown>)]);
  return Object.fromEntries(entries);
}

function toLowercaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

export interface SearchEntitiesV2Params {
  entityTypes: EntityType[];
  filterQuery?: string;
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: SortOrder;
}

export interface SearchEntitiesV2Inspect {
  dsl: string[];
  response: string[];
}

export interface SearchEntitiesV2Result {
  records: Entity[];
  total: number;
  inspect: SearchEntitiesV2Inspect;
}

export type SearchEntitiesV2BatchItemResult = SearchEntitiesV2Result | { readonly error: string };

const parseFilterQuery = (filterQuery: string | undefined): QueryDslQueryContainer | undefined => {
  if (!filterQuery) return;
  try {
    return JSON.parse(filterQuery) as QueryDslQueryContainer;
  } catch {
    throw new Error('Invalid filterQuery: must be valid JSON');
  }
};

const buildEntityQuery = (
  entityTypes: EntityType[],
  parsedQuery: QueryDslQueryContainer | undefined
): QueryDslQueryContainer | undefined => {
  const entityTypeFilter =
    entityTypes.length > 0 ? { terms: { 'entity.EngineMetadata.Type': entityTypes } } : undefined;
  return entityTypeFilter && parsedQuery
    ? { bool: { must: [entityTypeFilter, parsedQuery] } }
    : entityTypeFilter ?? parsedQuery;
};

const normalizeEntityHit = (raw: Record<string, unknown>): Entity => {
  const source = normalizeFlatDottedKeysToNested(raw);
  const asset = source.asset as { criticality?: string } | undefined;

  const assetOverwrite: Partial<Record<string, unknown>> =
    asset && asset.criticality !== ASSET_CRITICALITY_DELETED
      ? { asset: { criticality: asset.criticality } }
      : {};

  const merged = {
    ...source,
    ...assetOverwrite,
  } as Entity;

  const entityField = merged.entity as Record<string, unknown> | undefined;
  if (entityField && typeof entityField === 'object') {
    const normalized = buildNormalizedFields(entityField, ['behaviors', 'lifecycle', 'attributes']);
    return {
      ...merged,
      entity: { ...entityField, ...normalized },
    } as Entity;
  }

  return merged;
};

/**
 * Searches the Entity Store v2 unified latest index (same semantics as
 * Security Solution EntityStoreDataClient.searchEntities when v2 is enabled).
 */
export async function searchEntitiesV2(
  options: {
    esClient: ElasticsearchClient;
    namespace: string;
  } & SearchEntitiesV2Params
): Promise<SearchEntitiesV2Result> {
  const { esClient, namespace, entityTypes, filterQuery, page, perPage, sortField, sortOrder } =
    options;

  const parsedQuery = parseFilterQuery(filterQuery);
  const index = [await resolveLatestEntitiesIndexName(esClient, namespace)];
  const from = (page - 1) * perPage;
  const sort = sortField ? [{ [sortField]: sortOrder }] : undefined;
  const query = buildEntityQuery(entityTypes, parsedQuery);

  const response = await esClient.search({
    index,
    query,
    size: Math.min(perPage, MAX_SEARCH_RESPONSE_SIZE),
    from,
    sort,
    ignore_unavailable: true,
  });

  const { hits } = response;
  const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;
  const records = hits.hits.map((hit) =>
    normalizeEntityHit((hit._source ?? {}) as Record<string, unknown>)
  );

  const inspect: SearchEntitiesV2Inspect = {
    dsl: [JSON.stringify({ index, body: query }, null, 2)],
    response: [JSON.stringify(response, null, 2)],
  };

  return { records, total, inspect };
}

export async function searchEntitiesV2Batch(options: {
  esClient: ElasticsearchClient;
  namespace: string;
  queries: readonly SearchEntitiesV2Params[];
}): Promise<SearchEntitiesV2BatchItemResult[]> {
  const { esClient, namespace, queries } = options;
  if (queries.length === 0) return [];

  const index = [await resolveLatestEntitiesIndexName(esClient, namespace)];

  const built = queries.map((q) => {
    try {
      const query = buildEntityQuery(q.entityTypes, parseFilterQuery(q.filterQuery));
      return {
        ok: true as const,
        query,
        from: (q.page - 1) * q.perPage,
        size: Math.min(q.perPage, MAX_SEARCH_RESPONSE_SIZE),
        sort: q.sortField ? [{ [q.sortField]: q.sortOrder }] : undefined,
      };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });

  const searches: MsearchRequestItem[] = built.flatMap((b) =>
    b.ok
      ? [
          { index, ignore_unavailable: true },
          { query: b.query, size: b.size, from: b.from, sort: b.sort },
        ]
      : []
  );

  const responses = searches.length > 0 ? (await esClient.msearch({ searches })).responses : [];

  let responseIndex = 0;
  return built.map((b): SearchEntitiesV2BatchItemResult => {
    if (!b.ok) return { error: b.error };

    const response = responses[responseIndex++];
    if (response == null) {
      return { error: 'Missing msearch response for query' };
    }
    if ('error' in response) {
      return { error: response.error.reason ?? response.error.type };
    }

    const { hits } = response;
    const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;
    const records = hits.hits.map((hit) =>
      normalizeEntityHit((hit._source ?? {}) as Record<string, unknown>)
    );
    const inspect: SearchEntitiesV2Inspect = {
      dsl: [JSON.stringify({ index, body: b.query }, null, 2)],
      response: [JSON.stringify(response, null, 2)],
    };

    return { records, total, inspect };
  });
}
