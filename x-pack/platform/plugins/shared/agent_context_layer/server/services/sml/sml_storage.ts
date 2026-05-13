/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '../../../common/indices';
import type { SmlDocument } from './types';

export const smlIndexName = chatSystemIndex('sml-data');

/**
 * Single source of truth for SML data index field mappings (storage + Elasticsearch).
 *
 * Each text source field copies into a dedicated `semantic_text` mirror so the RRF retriever
 * can address them independently (`title_semantic`, `description_semantic`, `content_semantic`).
 */
const smlStorageSchemaProperties = {
  id: types.keyword({}),
  type: types.keyword({
    fields: {
      autocomplete: types.search_as_you_type({}),
    },
  }),
  title: types.text({ copy_to: ['title_autocomplete', 'title_semantic'] }),
  title_autocomplete: types.search_as_you_type({}),
  title_semantic: types.semantic_text({}),
  origin_id: types.keyword({}),
  content: types.text({ copy_to: 'content_semantic' }),
  content_semantic: types.semantic_text({}),
  description: types.text({ copy_to: 'description_semantic' }),
  description_semantic: types.semantic_text({}),
  tags: types.keyword({}),
  references: types.keyword({}),
  payload: types.flattened({}),
  user_id: types.keyword({}),
  created_at: types.date({}),
  updated_at: types.date({}),
  spaces: types.keyword({}),
  permissions: types.keyword({}),
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
