/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/** Key under `mappings._meta` holding the version this library has brought the resource to. */
export const VERSION_META_KEY = 'kbnMigrationVersion';

export const indexExists = async (esClient: ElasticsearchClient, index: string): Promise<boolean> =>
  esClient.indices.exists({ index });

/**
 * Reads the version stamped on the concrete index.
 *
 * Deliberately reads the index and not the index template: a template update does not
 * touch indices that already exist, so a template's `_meta` always reports the version
 * the current code intends, never the version a given index actually has.
 *
 * Returns undefined when the resource carries no stamp, which is the normal state for
 * anything created before this library existed. The caller falls back to `baseline`.
 */
export const readVersion = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<number | undefined> => {
  const response = await esClient.indices.getMapping({ index });
  const meta = Object.values(response)[0]?.mappings?._meta;
  const version = meta?.[VERSION_META_KEY];
  return typeof version === 'number' ? version : undefined;
};

/**
 * Applies mappings and stamps the version in a single request.
 *
 * `_meta` is replaced wholesale by Elasticsearch rather than merged, so the full object
 * is always sent - writing a partial `_meta` would erase the version and make the next
 * reconcile fall back to the baseline and re-apply everything.
 */
export const applyMappings = async (
  esClient: ElasticsearchClient,
  index: string,
  mappings: MappingTypeMapping,
  version: number
): Promise<void> => {
  await esClient.indices.putMapping({
    index,
    ...mappings,
    _meta: { ...mappings._meta, [VERSION_META_KEY]: version },
  });
};

/** Stamps a version without changing the shape. Used after a data step. */
export const stampVersion = async (
  esClient: ElasticsearchClient,
  index: string,
  version: number
): Promise<void> => {
  const response = await esClient.indices.getMapping({ index });
  const meta = Object.values(response)[0]?.mappings?._meta ?? {};
  await esClient.indices.putMapping({
    index,
    _meta: { ...meta, [VERSION_META_KEY]: version },
  });
};

export const createIndex = async (
  esClient: ElasticsearchClient,
  index: string,
  mappings: MappingTypeMapping,
  version: number
): Promise<void> => {
  await esClient.indices.create({
    index,
    mappings: {
      ...mappings,
      _meta: { ...mappings._meta, [VERSION_META_KEY]: version },
    },
  });
};
