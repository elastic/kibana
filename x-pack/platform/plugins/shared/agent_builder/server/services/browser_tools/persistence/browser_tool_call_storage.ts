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
import type { BrowserToolCallStatus, BrowserToolResultPayload } from '@kbn/agent-builder-common';

export const browserToolCallIndexName = chatSystemIndex('agent-browser-tool-calls');

const storageSettings = {
  name: browserToolCallIndexName,
  schema: {
    properties: {
      execution_id: types.keyword({}),
      tool_call_id: types.keyword({}),
      client_id: types.keyword({}),
      space_id: types.keyword({}),
      tool_id: types.keyword({}),
      status: types.keyword({}),
      created_at: types.date({}),
      expires_at: types.date({}),
      // The result can hold base64 images: it is stored in _source but never indexed.
      result: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export interface BrowserToolCallProperties {
  execution_id: string;
  tool_call_id: string;
  client_id?: string;
  space_id: string;
  tool_id: string;
  status: BrowserToolCallStatus;
  created_at: string;
  expires_at: string;
  result?: BrowserToolResultPayload;
}

export type BrowserToolCallStorageSettings = typeof storageSettings;

export type BrowserToolCallStorage = StorageIndexAdapter<
  BrowserToolCallStorageSettings,
  BrowserToolCallProperties
>;

export const createBrowserToolCallStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): BrowserToolCallStorage => {
  return new StorageIndexAdapter<BrowserToolCallStorageSettings, BrowserToolCallProperties>(
    esClient,
    logger,
    storageSettings
  );
};
