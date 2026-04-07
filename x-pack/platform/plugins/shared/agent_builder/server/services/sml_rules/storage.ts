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
import type { SmlRule } from '@kbn/agent-builder-common';

export const smlRulesIndexName = chatSystemIndex('sml-rules');

/**
 * Single source of truth for SML rules index field mappings.
 *
 * The `variables` field uses `dynamic: false` so its internal structure
 * is not mapped by Elasticsearch. Validation of variable shapes happens
 * at the route layer; this keeps the storage schema stable when new
 * variable types are added.
 */
const smlRulesStorageSchemaProperties = {
  id: types.keyword({}),
  name: types.keyword({}),
  type: types.keyword({}),
  index_pattern: types.keyword({}),
  inference_id: types.keyword({}),
  prompt: types.text({}),
  variables: types.object({ dynamic: false, properties: {} }),
  created_at: types.date({}),
  updated_at: types.date({}),
};

const storageSettings = {
  name: smlRulesIndexName,
  schema: {
    properties: smlRulesStorageSchemaProperties,
  },
} satisfies IndexStorageSettings;

export type SmlRulesStorageSettings = typeof storageSettings;

export type SmlRulesStorage = StorageIndexAdapter<SmlRulesStorageSettings, SmlRule>;

export const createSmlRulesStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlRulesStorage => {
  return new StorageIndexAdapter<SmlRulesStorageSettings, SmlRule>(
    esClient,
    logger,
    storageSettings
  );
};
