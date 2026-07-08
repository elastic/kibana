/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { SmlDocument } from '@kbn/agent-builder-server';

/**
 * `agent_builder` owns this index outright: it is a plain (non-system) index,
 * not a shared contract with `agent_context_layer`, and its mapping may
 * diverge freely from any Context Engine-suggested schema.
 */
export const smlIndexName = '.ab-sml-data';

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
  type: types.keyword({}),
  title: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  origin: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  content: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  description: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  tags: types.keyword({ normalizer: 'lowercase' }),
  /**
   * Autocomplete surface. `value` is `search_as_you_type` (SAYT); `kind`
   * drives UI badge rendering. The indexer auto-prepends title and type
   * entries; producers can add taglines, nicknames, etc.
   *
   * Known ES limitation: highlight snippets don't work for SAYT +
   * bool_prefix + nested (elastic/elasticsearch#53744).
   */
  discovery_labels: types.nested({
    properties: {
      value: types.search_as_you_type({}),
      kind: types.keyword({}),
    },
  }),
  references: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  extended_attrs: types.flattened({}),
  user_id: types.keyword({}),
  created_at: types.date({}),
  updated_at: types.date({}),
  spaces: types.keyword({}),
  permissions: types.object({
    properties: {
      kibana: types.object({
        properties: {
          privileges: types.object({
            properties: {
              name: types.keyword({}),
            },
          }),
        },
      }),
      elasticsearch: types.object({
        properties: {
          indices: types.object({
            properties: {
              name: types.keyword({}),
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

export type SmlStorageSettings = typeof storageSettings;

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
