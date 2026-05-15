/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesResolveIndexResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { EsResourceType } from '@kbn/agent-builder-common';
import type { MappingField } from '../mappings';
import { flattenMapping, getIndexMappings, getDataStreamMappings } from '../mappings';
import { processFieldCapsResponse } from '../field_caps';
import { isCcsTarget, getFieldsFromFieldCaps } from '../ccs';

export interface ResolveResourceResponse {
  /** name of the resource */
  name: string;
  /** type of the resource*/
  type: EsResourceType;
  /** list of fields */
  fields: MappingField[];
  /** description from the meta, if available */
  description?: string;
  /** whether the resource is a TSDB resource (any field has tsDimension or tsMetric) */
  isTsdb: boolean;
}

/**
 * Heuristic TSDB detection from field markers. Used as a fallback for resources where
 * we can't query an authoritative source per call: aliases, multi-target patterns, and
 * CCS / cross-project targets.
 */
export const deriveIsTsdb = (fields: MappingField[]): boolean => {
  return fields.some((f) => f.tsDimension === true || typeof f.tsMetric === 'string');
};

/**
 * Fetches index settings as a flat key/value object. Returns the raw typed response so
 * callers can read whichever setting(s) they need (`index.mode`, `index.lifecycle.name`, ...).
 */
const getIndexSettings = async ({
  indexName,
  esClient,
}: {
  indexName: string;
  esClient: ElasticsearchClient;
}) => {
  return esClient.indices.getSettings({
    index: indexName,
    flat_settings: true,
  });
};

/**
 * Fetches a data stream definition. Returns the raw typed response so callers can read
 * whichever property they need (`indices[].index_mode`, `generation`, `lifecycle`, ...).
 *
 * All backing indices of a single data stream share `index.mode` (it's inherited from the
 * index template at every rollover), so a single backing-index entry is enough to decide
 * the mode of the stream.
 */
const getDataStream = async ({
  datastreamName,
  esClient,
}: {
  datastreamName: string;
  esClient: ElasticsearchClient;
}) => {
  return esClient.indices.getDataStream({ name: datastreamName });
};
/**
 * Retrieve the field list and other relevant info from the given resource name (index, alias or datastream)
 * Note: this can target a single resource, the resource name must not be a pattern.
 */
export const resolveResource = async ({
  resourceName,
  esClient,
}: {
  resourceName: string;
  esClient: ElasticsearchClient;
}): Promise<ResolveResourceResponse> => {
  if (resourceName.includes(',') || resourceName.includes('*')) {
    throw new Error(
      `Tried to resolve resource for multiple resources using pattern ${resourceName}`
    );
  }

  let resolveRes: IndicesResolveIndexResponse;
  try {
    resolveRes = await esClient.indices.resolveIndex({
      name: [resourceName],
      allow_no_indices: false,
    });
  } catch (e) {
    if (isNotFoundError(e)) {
      throw new Error(`No resource found for '${resourceName}'`);
    }
    throw e;
  }

  const resourceCount =
    resolveRes.indices.length + resolveRes.aliases.length + resolveRes.data_streams.length;

  if (resourceCount !== 1) {
    throw new Error(`Found multiple targets when trying to resolve resource for ${resourceName}`);
  }

  return resolveSingleResource({ resourceName, resolveRes, esClient });
};

/**
 * Retrieve resource metadata for ES|QL generation.
 * Supports index patterns and comma-separated targets by using field_caps
 * when multiple resources are resolved. Multi-target results use {@link EsResourceType.indexPattern}.
 */
export const resolveResourceForEsql = async ({
  resourceName,
  esClient,
}: {
  resourceName: string;
  esClient: ElasticsearchClient;
}): Promise<ResolveResourceResponse> => {
  let resolveRes: IndicesResolveIndexResponse;
  try {
    resolveRes = await esClient.indices.resolveIndex({
      name: [resourceName],
      allow_no_indices: false,
      expand_wildcards: ['all'],
    });
  } catch (e) {
    if (isNotFoundError(e)) {
      throw new Error(`No resource found for '${resourceName}'`);
    }
    throw e;
  }

  const resourceCount =
    resolveRes.indices.length + resolveRes.aliases.length + resolveRes.data_streams.length;

  if (resourceCount === 0) {
    throw new Error(`No resource found for pattern ${resourceName}`);
  }

  if (resourceCount === 1) {
    return resolveSingleResource({ resourceName, resolveRes, esClient });
  }

  const fieldCapRes = await esClient.fieldCaps({
    index: resourceName,
    fields: ['*'],
  });
  const { fields } = processFieldCapsResponse(fieldCapRes);

  return {
    name: resourceName,
    type: EsResourceType.indexPattern,
    fields,
    isTsdb: deriveIsTsdb(fields),
  };
};

const resolveSingleResource = async ({
  resourceName,
  resolveRes,
  esClient,
}: {
  resourceName: string;
  resolveRes: IndicesResolveIndexResponse;
  esClient: ElasticsearchClient;
}): Promise<ResolveResourceResponse> => {
  // target is an index
  if (resolveRes.indices.length > 0) {
    const indexName = resolveRes.indices[0].name;

    // CCS fallback: the _mapping API does not support remote indices,
    // so we use the CCS-compatible _field_caps API instead.
    // Trade-off: _meta.description is not available via _field_caps.
    if (isCcsTarget(resourceName)) {
      const fields = await getFieldsFromFieldCaps({ resource: indexName, esClient });
      return {
        name: resourceName,
        type: EsResourceType.index,
        fields,
        isTsdb: deriveIsTsdb(fields),
      };
    }

    const [mappingRes, settingsRes] = await Promise.all([
      getIndexMappings({ indices: [indexName], esClient, cleanup: true }),
      getIndexSettings({ indexName, esClient }),
    ]);
    const mappings = mappingRes[indexName].mappings;
    const fields = flattenMapping(mappings);
    const isTsdb = settingsRes[indexName]?.settings?.['index.mode'] === 'time_series';
    return {
      name: resourceName,
      type: EsResourceType.index,
      fields,
      description: mappings._meta?.description,
      isTsdb,
    };
  }
  // target is a datastream
  if (resolveRes.data_streams.length > 0) {
    const datastream = resolveRes.data_streams[0].name;

    // CCS fallback: the _data_stream/_mappings API does not support remote data streams,
    // so we use the CCS-compatible _field_caps API instead.
    // Trade-off: _meta.description is not available via _field_caps.
    if (isCcsTarget(resourceName)) {
      const fields = await getFieldsFromFieldCaps({ resource: datastream, esClient });
      return {
        name: resourceName,
        type: EsResourceType.dataStream,
        fields,
        isTsdb: deriveIsTsdb(fields),
      };
    }

    const [mappingRes, dataStreamRes] = await Promise.all([
      getDataStreamMappings({
        datastreams: [datastream],
        esClient,
        cleanup: true,
      }),
      getDataStream({ datastreamName: datastream, esClient }),
    ]);
    const mappings = mappingRes[datastream].mappings;
    const fields = flattenMapping(mappings);
    // `index_mode` may not yet be in the published TS types; cast as a safety net.
    const firstBackingIndex = dataStreamRes.data_streams[0]?.indices?.[0] as
      | { index_mode?: string }
      | undefined;
    const isTsdb = firstBackingIndex?.index_mode === 'time_series';
    return {
      name: resourceName,
      type: EsResourceType.dataStream,
      fields,
      description: mappings._meta?.description,
      isTsdb,
    };
  }
  // target is an alias
  if (resolveRes.aliases.length > 0) {
    const alias = resolveRes.aliases[0].name;

    const fieldCapRes = await esClient.fieldCaps({
      index: alias,
      fields: ['*'],
    });

    const { fields } = processFieldCapsResponse(fieldCapRes);

    return {
      name: resourceName,
      type: EsResourceType.alias,
      fields,
      isTsdb: deriveIsTsdb(fields),
    };
  }

  throw new Error(`No resource found for pattern ${resourceName}`);
};
