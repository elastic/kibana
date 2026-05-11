/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import pLimit from 'p-limit';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingField } from './mappings';
import { flattenMapping, getIndexMappings, getDataStreamMappings } from './mappings';
import type { GetIndexMappingsResult } from './mappings/get_index_mappings';
import type { GetDataStreamMappingsResults } from './mappings/get_datastream_mappings';
import { processFieldCapsResponse, processFieldCapsResponsePerIndex } from './field_caps';
import { batchByUrlLength } from './batch_by_url_length';
import { listSearchSources } from '../steps/list_search_sources';

/**
 * Returns true if the resource name targets a remote cluster (contains ':'),
 * indicating a cross-cluster search (CCS) target.
 *
 * Examples:
 *  - 'remote_cluster:my-index' => true
 *  - 'my-local-index' => false
 *  - 'cluster_a:logs-*' => true
 */
export const isCcsTarget = (name: string): boolean => name.includes(':');

/**
 * Partition an array of named resources into local and CCS (remote) groups.
 * A resource is considered remote if its name contains ':'.
 */
export const partitionByCcs = <T extends { name: string }>(
  resources: T[]
): { local: T[]; remote: T[] } => {
  const local: T[] = [];
  const remote: T[] = [];
  for (const r of resources) {
    if (isCcsTarget(r.name)) {
      remote.push(r);
    } else {
      local.push(r);
    }
  }
  return { local, remote };
};

/**
 * Retrieves the field list for a given resource using the _field_caps API,
 * which supports cross-cluster search (CCS) index patterns.
 *
 * This is used as a CCS-compatible fallback for the _mapping and
 * _data_stream/_mappings APIs, which do not support remote indices.
 */
export const getFieldsFromFieldCaps = async ({
  resource,
  esClient,
}: {
  resource: string;
  esClient: ElasticsearchClient;
}): Promise<MappingField[]> => {
  const fieldCapRes = await esClient.fieldCaps({ index: resource, fields: ['*'] });
  const { fields } = processFieldCapsResponse(fieldCapRes);
  return fields;
};

/**
 * Issues a single _field_caps request for all provided resource names and
 * splits the merged response back into per-resource field lists using the
 * per-capability `indices` property.
 */
export const getBatchedFieldsFromFieldCaps = async ({
  resources,
  esClient,
}: {
  resources: string[];
  esClient: ElasticsearchClient;
}): Promise<Record<string, MappingField[]>> => {
  if (resources.length === 0) {
    return {};
  }

  const batches = batchByUrlLength(resources);

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const fieldCapRes = await esClient.fieldCaps({
        index: batch.join(','),
        fields: ['*'],
      });
      return processFieldCapsResponsePerIndex(fieldCapRes);
    })
  );

  const merged: Record<string, MappingField[]> = {};
  for (const batchResult of batchResults) {
    for (const [name, fields] of Object.entries(batchResult)) {
      merged[name] = fields;
    }
  }

  for (const name of resources) {
    if (!merged[name]) {
      merged[name] = [];
    }
  }

  return merged;
};

export type IndexFieldType = 'index' | 'dataStream' | 'alias' | 'indexPattern';

export interface IndexFieldsResult {
  type: IndexFieldType;
  fields: MappingField[];
  rawMapping?: MappingTypeMapping;
}

type LocalResolution =
  | { input: string; kind: 'index'; concreteName: string }
  | { input: string; kind: 'dataStream'; concreteName: string }
  | { input: string; kind: 'alias'; concreteName: string }
  | { input: string; kind: 'indexPattern' };

/**
 * Classify a single local input by resolving it via `listSearchSources`
 * (which wraps `_resolve/index` + 404 handling). Only inputs that resolve
 * to exactly one concrete resource (index or data stream) are routed to a
 * mapping API; aliases get `_field_caps` for the unified field list; every-
 * thing else (wildcards, missing names) goes through `_field_caps` as a
 * pattern.
 */
const resolveLocalTarget = async ({
  input,
  esClient,
}: {
  input: string;
  esClient: ElasticsearchClient;
}): Promise<LocalResolution> => {
  const res = await listSearchSources({
    pattern: input,
    esClient,
    includeKibanaIndices: true,
    includeHidden: true,
    excludeIndicesRepresentedAsAlias: true,
    excludeIndicesRepresentedAsDatastream: true,
  });

  const total = res.indices.length + res.data_streams.length + res.aliases.length;
  if (total === 1) {
    if (res.indices.length === 1) {
      return { input, kind: 'index', concreteName: res.indices[0].name };
    }
    if (res.data_streams.length === 1) {
      return { input, kind: 'dataStream', concreteName: res.data_streams[0].name };
    }
    if (res.aliases.length === 1) {
      return { input, kind: 'alias', concreteName: res.aliases[0].name };
    }
  }

  return { input, kind: 'indexPattern' };
};

/**
 * Resolves field information for a list of indices, transparently handling
 * the local-vs-CCS split. Local inputs are classified via `_resolve/index`
 * and routed to the appropriate mapping / field-caps fetcher; CCS inputs
 * go directly to the batched _field_caps API.
 */
export const getIndexFields = async ({
  indices,
  esClient,
  cleanup = true,
}: {
  indices: string[];
  esClient: ElasticsearchClient;
  cleanup?: boolean;
}): Promise<Record<string, IndexFieldsResult>> => {
  const local = indices.filter((i) => !isCcsTarget(i));
  const remote = indices.filter((i) => isCcsTarget(i));
  const result: Record<string, IndexFieldsResult> = {};

  if (local.length > 0) {
    const resolveLimit = pLimit(5);
    const resolutions = await Promise.all(
      local.map((input) => resolveLimit(() => resolveLocalTarget({ input, esClient })))
    );

    // All buckets share the same `{input, concrete}` shape. For `indexPattern`
    // entries we don't have a resolved concrete name, so we use `input` (the
    // user's verbatim string) — `_field_caps` treats it as a pattern anyway.
    const buckets: Record<IndexFieldType, Array<{ input: string; concrete: string }>> = {
      index: [],
      dataStream: [],
      alias: [],
      indexPattern: [],
    };
    for (const r of resolutions) {
      const concrete = r.kind === 'indexPattern' ? r.input : r.concreteName;
      buckets[r.kind].push({ input: r.input, concrete });
    }

    // Shared concurrency cap across all four fetch paths (index/ds/alias/
    // pattern). Each per-input field_caps call and each batched mapping call
    // counts as one slot against this limit.
    const fetchLimit = pLimit(5);
    const [indexMappings, dsMappings, aliasResults, patternResults] = await Promise.all([
      buckets.index.length > 0
        ? fetchLimit(() =>
            getIndexMappings({
              indices: buckets.index.map((i) => i.concrete),
              cleanup,
              esClient,
            })
          )
        : Promise.resolve({} as GetIndexMappingsResult),
      buckets.dataStream.length > 0
        ? fetchLimit(() =>
            getDataStreamMappings({
              datastreams: buckets.dataStream.map((i) => i.concrete),
              cleanup,
              esClient,
            })
          )
        : Promise.resolve({} as GetDataStreamMappingsResults),
      Promise.all(
        buckets.alias.map(async (a) => ({
          input: a.input,
          fields: await fetchLimit(() =>
            getFieldsFromFieldCaps({ resource: a.concrete, esClient })
          ),
        }))
      ),
      Promise.all(
        buckets.indexPattern.map(async (p) => ({
          input: p.input,
          fields: await fetchLimit(() =>
            getFieldsFromFieldCaps({ resource: p.concrete, esClient })
          ),
        }))
      ),
    ]);

    for (const { input, concrete } of buckets.index) {
      const entry = indexMappings[concrete];
      if (!entry) {
        // Race: resolved to a concrete index, but it's gone by the time we
        // fetch. Degrade to indexPattern rather than crashing.
        result[input] = { type: 'indexPattern', fields: [] };
        continue;
      }
      result[input] = {
        type: 'index',
        fields: flattenMapping(entry.mappings),
        rawMapping: entry.mappings,
      };
    }
    for (const { input, concrete } of buckets.dataStream) {
      const entry = dsMappings[concrete];
      if (!entry) {
        result[input] = { type: 'indexPattern', fields: [] };
        continue;
      }
      result[input] = {
        type: 'dataStream',
        fields: flattenMapping(entry.mappings),
        rawMapping: entry.mappings,
      };
    }
    for (const { input, fields } of aliasResults) {
      result[input] = { type: 'alias', fields };
    }
    for (const { input, fields } of patternResults) {
      result[input] = { type: 'indexPattern', fields };
    }
  }

  if (remote.length > 0) {
    const fieldsByIndex = await getBatchedFieldsFromFieldCaps({
      resources: remote,
      esClient,
    });
    for (const idx of remote) {
      result[idx] = { type: 'indexPattern', fields: fieldsByIndex[idx] ?? [] };
    }
  }

  return result;
};
