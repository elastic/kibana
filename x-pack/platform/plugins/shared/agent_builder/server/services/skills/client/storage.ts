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
import type { SkillReferencedContent } from '@kbn/agent-builder-common';

export const skillIndexName = chatSystemIndex('skills');

const storageSettings = {
  name: skillIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      name: types.keyword({}),
      space: types.keyword({}),
      description: types.text({}),
      content: types.text({}),
      referenced_content: types.object({
        dynamic: false,
        properties: {},
      }),
      tool_ids: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface SkillProperties {
  id: string;
  name: string;
  space: string;
  description: string;
  content: string;
  referenced_content?: SkillReferencedContent[];
  tool_ids: string[];
  created_at: string;
  updated_at: string;
}

export type SkillStorageSettings = typeof storageSettings;

export type SkillStorage = StorageIndexAdapter<SkillStorageSettings, SkillProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SkillStorage => {
  return new StorageIndexAdapter<SkillStorageSettings, SkillProperties>(
    esClient,
    logger,
    storageSettings
  );
};
