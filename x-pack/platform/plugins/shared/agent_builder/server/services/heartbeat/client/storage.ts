/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { HeartbeatIntervalUnit, HeartbeatStatus } from '../../../../common/heartbeats';

export const heartbeatsIndexName = chatSystemIndex('heartbeats');

const storageSettings = {
  name: heartbeatsIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      agent_id: types.keyword({}),
      space: types.keyword({}),
      name: types.keyword({}),
      prompt: types.text({}),
      interval_value: types.long({}),
      interval_unit: types.keyword({}),
      start_time: types.date({}),
      status: types.keyword({}),
      conversation_id: types.keyword({}),
      task_id: types.keyword({}),
      last_executed_at: types.date({}),
      last_error: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

/**
 * The document shape stored in Elasticsearch for a heartbeat.
 * Includes `space` for multi-tenancy, which is not exposed in the API.
 */
export interface HeartbeatDocument {
  id: string;
  agent_id: string;
  space: string;
  name: string;
  prompt: string;
  interval_value: number;
  interval_unit: HeartbeatIntervalUnit;
  start_time?: string;
  status: HeartbeatStatus;
  conversation_id: string;
  task_id?: string;
  last_executed_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export type HeartbeatStorageSettings = typeof storageSettings;

export type HeartbeatStorage = StorageIndexAdapter<HeartbeatStorageSettings, HeartbeatDocument>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): HeartbeatStorage => {
  return new StorageIndexAdapter<HeartbeatStorageSettings, HeartbeatDocument>(
    esClient,
    logger,
    storageSettings
  );
};
