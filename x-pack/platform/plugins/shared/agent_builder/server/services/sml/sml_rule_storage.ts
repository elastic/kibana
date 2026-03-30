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
import type { SmlRuleType, SmlRuleVariable } from '../../../common/http_api/sml_rules';

export const smlRuleIndexName = chatSystemIndex('sml-rules');

const SEMANTIC_TEXT_INFERENCE_ID = '.jina-embeddings-v5-small';

const smlRuleStorageSchemaProperties = {
  id: types.keyword({}),
  name: types.text({ copy_to: 'semantic_name' }),
  semantic_name: types.semantic_text({ inference_id: SEMANTIC_TEXT_INFERENCE_ID }),
  type: types.keyword({}),
  index_pattern: types.keyword({}),
  prompt: types.text({ copy_to: 'semantic_prompt' }),
  semantic_prompt: types.semantic_text({ inference_id: SEMANTIC_TEXT_INFERENCE_ID }),
  inference_id: types.keyword({}),
  variables: types.object({ dynamic: false }),
  space: types.keyword({}),
  created_at: types.date({}),
  updated_at: types.date({}),
};

const storageSettings = {
  name: smlRuleIndexName,
  schema: {
    properties: smlRuleStorageSchemaProperties,
  },
} satisfies IndexStorageSettings;

export type SmlRuleStorageSettings = typeof storageSettings;

export interface SmlRuleDocument {
  id: string;
  name: string;
  type: SmlRuleType;
  index_pattern: string;
  prompt?: string;
  inference_id: string;
  variables?: Record<string, SmlRuleVariable>;
  space: string;
  created_at: string;
  updated_at: string;
}

export type SmlRuleStorage = StorageIndexAdapter<SmlRuleStorageSettings, SmlRuleDocument>;

export const createSmlRuleStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlRuleStorage => {
  return new StorageIndexAdapter<SmlRuleStorageSettings, SmlRuleDocument>(
    esClient,
    logger,
    storageSettings
  );
};
