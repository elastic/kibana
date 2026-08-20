/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { SmlDocument } from './types';

export const smlIndexName = 'ai-index-idx-sml-data';

/**
 * Bump this constant whenever the shape of stored SML documents changes in a way
 * that makes existing documents stale (e.g. new required composite-token fields,
 * changed semantics of existing fields).  The crawler reads `_meta.sml_schema_version`
 * from the live index; a mismatch causes a drop-and-recrawl even when the mapping
 * change itself is compatible (additive) and would not trigger the normal rebuild path.
 *
 * History:
 *   1 — original shape (pre-composite-token era)
 *   2 — `permissions.kibana.privileges` becomes `nested`, one element per space carrying
 *       `{ space, name[], count }`. `raw` and the implicit `login:` action are gone.
 *
 * Motivation: `object` -> `nested` is an illegal mapping merge ("can't merge a non-nested mapping
 * with a nested mapping"), so an existing index cannot be updated in place.
 * The version mismatch drops the index and forces a full re-crawl, which is the
 * only way this shape change can land.
 */
export const SML_SCHEMA_VERSION = 2;

const SEMANTIC_MULTI_FIELD = {
  semantic: types.semantic_text({}),
};

/**
 * Single source of truth for SML data index field mappings (storage + Elasticsearch).
 *
 * Each text source field carries a `semantic` multi-field (`title.semantic`,
 * `description.semantic`, `content.semantic`) so the RRF retriever can address
 * them independently without a separate top-level field or `copy_to`.
 */
const smlStorageSchemaProperties = {
  id: types.keyword({}),
  /** Normalized to lowercase so the @ menu's `prefix` query is case-insensitive. */
  type: types.keyword({ normalizer: 'lowercase' }),
  title: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  origin: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  content: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  description: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  tags: types.keyword({ normalizer: 'lowercase' }),
  references: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  extended_attrs: types.flattened({}),
  user_id: types.keyword({}),
  created_at: types.date({}),
  updated_at: types.date({}),
  permissions: types.object({
    properties: {
      kibana: types.object({
        properties: {
          /**
           * One element per space, each listing the actions that space requires plus a count of
           * them. `nested` (not `object`) so ES-side DLS can bind space and action together within
           * a single element — a flat field cannot express "all these actions, in this one space",
           * which let a user holding one required action in each of two spaces clear a flat
           * `terms_set` threshold. `discovery_labels` above is already nested, so this is an
           * established shape in this index.
           *
           * Caveat: ES|QL cannot read `nested` leaves (its index resolution filters them out), so
           * the read path authorizes via a `nested` Query DSL filter pushed into the `_query`
           * `filter` parameter rather than a WHERE clause or a projected column.
           */
          privileges: types.nested({
            properties: {
              name: types.keyword({}),
              space: types.keyword({}),
              count: types.long({}),
            },
          }),
        },
      }),
    },
  }),
  ingestion_method: types.keyword({}),
};

export const storageSettings = {
  name: smlIndexName,
  /**
   * Ensure the SML backing index name has a higher priority than built-in AI index templates.
   */
  priority: 600,
  schema: {
    properties: smlStorageSchemaProperties,
  },
} satisfies IndexStorageSettings;

/**
 * Elasticsearch `mappings` block for the SML data index (e.g. integration tests, tooling).
 * Field definitions match `smlStorageSchemaProperties` / `storageSettings`.
 */
export const smlElasticsearchIndexMappings = {
  dynamic: 'strict' as const,
  properties: smlStorageSchemaProperties,
};

type SmlStorageSettings = typeof storageSettings;

export type SmlStorage = StorageIndexAdapter<SmlStorageSettings, SmlDocument>;

export const createSmlStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlStorage => {
  return new StorageIndexAdapter<SmlStorageSettings, SmlDocument>(
    esClient,
    logger,
    storageSettings
  );
};
