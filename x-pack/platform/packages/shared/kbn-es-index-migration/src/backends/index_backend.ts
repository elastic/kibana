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

/**
 * Task Manager aborts this signal on timeout or shutdown. It is the only channel it has
 * to ask for a stop, so it is passed to every request rather than only the long ones.
 */
export interface Abortable {
  signal?: AbortSignal;
}

export const indexExists = async (
  esClient: ElasticsearchClient,
  index: string,
  { signal }: Abortable = {}
): Promise<boolean> => esClient.indices.exists({ index }, { signal });

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
  index: string,
  { signal }: Abortable = {}
): Promise<number | undefined> => {
  const response = await esClient.indices.getMapping({ index }, { signal });
  const meta = Object.values(response)[0]?.mappings?._meta;
  const version = meta?.[VERSION_META_KEY];
  return typeof version === 'number' ? version : undefined;
};

/**
 * Reads the `_meta` already on the index.
 *
 * Elasticsearch replaces `_meta` wholesale rather than merging it, so every write has to
 * start from what is there. An index is frequently managed by something else as well -
 * Asset Criticality keeps its own `_meta.version`, and other plugins keep their own keys
 * - and overwriting that silently breaks whatever relies on it.
 */
const readMeta = async (
  esClient: ElasticsearchClient,
  index: string,
  { signal }: Abortable = {}
): Promise<Record<string, unknown>> => {
  const response = await esClient.indices.getMapping({ index }, { signal });
  return (Object.values(response)[0]?.mappings?._meta ?? {}) as Record<string, unknown>;
};

/**
 * Merges this library's version stamp into whatever `_meta` the index already has.
 *
 * Index first so unknown keys survive, declaration second because it is the current
 * intent, our key last because nothing else may set it.
 */
const mergeMeta = (
  existing: Record<string, unknown>,
  declared: MappingTypeMapping['_meta'],
  version: number
): Record<string, unknown> => ({
  ...existing,
  ...declared,
  [VERSION_META_KEY]: version,
});

/** Applies mappings and stamps the version in a single request. */
export const applyMappings = async (
  esClient: ElasticsearchClient,
  index: string,
  mappings: MappingTypeMapping,
  version: number,
  { signal }: Abortable = {}
): Promise<void> => {
  const existing = await readMeta(esClient, index, { signal });

  await esClient.indices.putMapping(
    {
      index,
      ...mappings,
      _meta: mergeMeta(existing, mappings._meta, version),
    },
    { signal }
  );
};

/** Stamps a version without changing the shape. Used after a data step. */
export const stampVersion = async (
  esClient: ElasticsearchClient,
  index: string,
  version: number,
  { signal }: Abortable = {}
): Promise<void> => {
  const existing = await readMeta(esClient, index, { signal });

  await esClient.indices.putMapping(
    { index, _meta: mergeMeta(existing, undefined, version) },
    { signal }
  );
};

export const createIndex = async (
  esClient: ElasticsearchClient,
  index: string,
  mappings: MappingTypeMapping,
  version: number,
  { signal }: Abortable = {}
): Promise<void> => {
  await esClient.indices.create(
    {
      index,
      mappings: {
        ...mappings,
        _meta: { ...mappings._meta, [VERSION_META_KEY]: version },
      },
    },
    { signal }
  );
};
