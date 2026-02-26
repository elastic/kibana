/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingField } from './mappings';
import { flattenMapping, getIndexMappings } from './mappings';
import { processFieldCapsResponse, processFieldCapsResponsePerIndex } from './field_caps';

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

  const fieldCapRes = await esClient.fieldCaps({
    index: resources.join(','),
    fields: ['*'],
  });

  const perIndex = processFieldCapsResponsePerIndex(fieldCapRes);

  const result: Record<string, MappingField[]> = {};
  for (const name of resources) {
    result[name] = perIndex[name] ?? [];
  }
  return result;
};

export interface IndexFieldsResult {
  fields: MappingField[];
  rawMapping?: MappingTypeMapping;
}

/**
 * Resolves field information for a list of indices, transparently handling
 * the local-vs-CCS split. Local indices use the _mapping API (preserving
 * the full mapping tree in `rawMapping`), while CCS indices fall back to
 * the batched _field_caps API.
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
    const mappings = await getIndexMappings({ indices: local, cleanup, esClient });
    for (const idx of local) {
      const entry = mappings[idx];
      result[idx] = {
        fields: flattenMapping(entry.mappings),
        rawMapping: entry.mappings,
      };
    }
  }

  if (remote.length > 0) {
    const fieldsByIndex = await getBatchedFieldsFromFieldCaps({
      resources: remote,
      esClient,
    });
    for (const idx of remote) {
      result[idx] = { fields: fieldsByIndex[idx] ?? [] };
    }
  }

  return result;
};
