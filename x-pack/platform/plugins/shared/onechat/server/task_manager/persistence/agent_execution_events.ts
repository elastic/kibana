/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatSystemIndex } from '@kbn/onechat-server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AgentExecutionEvent } from '../types';

export const agentExecutionEventsIndexName = chatSystemIndex('agent-execution-events');

const storageSettings = {
  name: agentExecutionEventsIndexName,
  schema: {
    properties: {
      '@timestamp': types.date({}),
      agentId: types.keyword({}),
      executionId: types.keyword({}),
      spaceId: types.keyword({}),
      event: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export interface AgentExecutionEventsProperties {
  '@timestamp': string;
  agentId: string;
  executionId: string;
  spaceId: string;
  event: Record<string, unknown>;
}

export type AgentExecutionEventsSettings = typeof storageSettings;

export type AgentExecutionEventsStorage = StorageIndexAdapter<
  AgentExecutionEventsSettings,
  AgentExecutionEventsProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentExecutionEventsStorage => {
  return new StorageIndexAdapter<AgentExecutionEventsSettings, AgentExecutionEventsProperties>(
    esClient,
    logger,
    storageSettings
  );
};

export interface AgentExecutionEventsRepository {
  // TODO: API
  storeEvents(opts: { agentId: string; executionId: string; spaceId: string; events: any[] });
}

export const createRepository = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): AgentExecutionEventsRepository => {
  const storage = createStorage({ logger, esClient });

  return {
    storeEvents(opts) {
      const { agentId, executionId, spaceId, events } = opts;
      // TODO: store events
    },
  };
};
