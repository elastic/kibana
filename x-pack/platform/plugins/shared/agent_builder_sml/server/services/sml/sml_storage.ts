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

/** Base mappings every AI index gets, shipped by Elasticsearch's stack templates. */
const AI_INDEX_BASE_MAPPINGS_COMPONENT = 'ai-index@mappings';

/**
 * Customization slot Elasticsearch reserves for users. It applies to every
 * `ai-index-idx-*` index, so Kibana must never install it.
 */
const AI_INDEX_CUSTOM_COMPONENT = 'ai-index@custom';

/** Kibana-owned component carrying the fields only the SML index needs. */
export const smlMappingsComponentTemplateName = 'ai-index-idx-sml-data@mappings';

const SEMANTIC_MULTI_FIELD = {
  semantic: types.semantic_text({}),
};

/**
 * Fields `ai-index@mappings` already provides. Declared here so the storage
 * schema (and therefore `SmlDocument` and the mapping version hash) covers the
 * whole document, but deliberately *not* installed by Kibana — they reach the
 * index by composing the base component.
 *
 * Each text source field carries a `semantic` multi-field (`title.semantic`,
 * `description.semantic`, `content.semantic`) so the RRF retriever can address
 * them independently without a separate top-level field or `copy_to`.
 */
const baseProvidedSchemaProperties = {
  title: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  content: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  description: types.text({ fields: SEMANTIC_MULTI_FIELD }),
  references: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
};

/**
 * Fields the base component does not provide, installed as
 * {@link smlMappingsComponentTemplateName}.
 *
 * `tags` and `type` are listed here even though the base maps them too: SML needs
 * the lowercase normalizer on both, and this component is composed last so it wins.
 */
export const smlMappingsComponentProperties = {
  id: types.keyword({}),
  /** Normalized to lowercase so the @ menu's `type` prefix query is case-insensitive. */
  type: types.keyword({ normalizer: 'lowercase' }),
  origin: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
  tags: types.keyword({ normalizer: 'lowercase' }),
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
    },
  }),
  ingestion_method: types.keyword({}),
};

/**
 * Single source of truth for the SML document shape: the union of what the base
 * component provides and what SML adds. Drives `SmlDocument` and the mapping
 * version hash; the index template itself installs no properties.
 */
const smlStorageSchemaProperties = {
  ...baseProvidedSchemaProperties,
  ...smlMappingsComponentProperties,
};

export const storageSettings = {
  name: smlIndexName,
  /**
   * Elasticsearch's `ai-index-idx` template matches `ai-index-idx-sml-data-*` at
   * priority 500, and index templates do not compose with each other — only the
   * highest priority applies. So SML outranks it and composes the same base
   * component itself, rather than duplicating the base mappings.
   */
  priority: 600,
  /**
   * Increasing precedence. SML's own component is composed *after* the user slot
   * so a user editing `ai-index@custom` cannot break SML's internal fields.
   */
  composedOf: [
    AI_INDEX_BASE_MAPPINGS_COMPONENT,
    AI_INDEX_CUSTOM_COMPONENT,
    smlMappingsComponentTemplateName,
  ],
  /**
   * Only the user slot may be absent. SML's own component is intentionally
   * excluded: were it missing, the index would be created without SML's fields
   * and the version check would never repair it, so failing the write loudly is
   * safer.
   */
  ignoreMissingComponentTemplates: [AI_INDEX_CUSTOM_COMPONENT],
  inlineSchemaMappings: false,
  schema: {
    properties: smlStorageSchemaProperties,
  },
} satisfies IndexStorageSettings;

/**
 * The full SML document shape as an Elasticsearch `mappings` block, for tests and
 * tooling that create an index directly.
 *
 * This is *not* what Kibana installs: in production the base fields arrive from
 * `ai-index@mappings` and the rest from {@link smlMappingsComponentTemplateName}.
 * Use this only when you want a standalone index with the same document shape.
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
