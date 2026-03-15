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
import type { SmlDocument } from './types';

export const smlIndexName = chatSystemIndex('sml-data');

const storageSettings = {
  name: smlIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      type: types.keyword({}),
      title: types.text({}),
      attachment_reference_id: types.keyword({}),
      content: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      spaces: types.keyword({}),
      permissions: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

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
