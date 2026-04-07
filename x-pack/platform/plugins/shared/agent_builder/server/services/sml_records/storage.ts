/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { SmlDocument } from '../sml/types';

export const smlRecordsIndexName = chatSystemIndex('sml-data');

/**
 * Single source of truth for SML records index field mappings.
 *
 * Re-uses the same `sml-data` system index as the SML service.
 * The `params` field uses `dynamic: false` so its internal structure
 * is not mapped by Elasticsearch. Validation of parameter shapes happens
 * at the route layer.
 */
const smlRecordsStorageSchemaProperties = {
  id: types.keyword({}),
  type: types.keyword({
    fields: {
      autocomplete: types.search_as_you_type({}),
    },
  }),
  title: types.search_as_you_type({}),
  origin_id: types.keyword({}),
  content: types.text({}),
  created_at: types.date({}),
  updated_at: types.date({}),
  spaces: types.keyword({}),
  permissions: types.keyword({}),
  tags: types.keyword({}),
  user_defined: types.boolean({}),
  params: types.object({ dynamic: false, properties: {} }),
  semantic_title: types.semantic_text({}),
  semantic_content: types.semantic_text({}),
};

const storageSettings = {
  name: smlRecordsIndexName,
  schema: {
    properties: smlRecordsStorageSchemaProperties,
  },
} satisfies IndexStorageSettings;

export type SmlRecordsStorageSettings = typeof storageSettings;

export type SmlRecordsStorage = StorageIndexAdapter<SmlRecordsStorageSettings, SmlDocument>;

export const createSmlRecordsStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlRecordsStorage => {
  return new StorageIndexAdapter<SmlRecordsStorageSettings, SmlDocument>(
    esClient,
    logger,
    storageSettings
  );
};
