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
import type { AgentExecution } from '../types';

export const agentExecutionIndexName = chatSystemIndex('agent-executions');

const storageSettings = {
  name: agentExecutionIndexName,
  schema: {
    properties: {
      executionId: types.keyword({}),
      agentId: types.keyword({}),
      spaceId: types.keyword({}),
      agentParams: types.object({ dynamic: false }),
    },
  },
} satisfies IndexStorageSettings;

export type AgentExecutionProperties = AgentExecution;

export type AgentExecutionSettings = typeof storageSettings;

export type AgentExecutionStorage = StorageIndexAdapter<
  AgentExecutionSettings,
  AgentExecutionProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentExecutionStorage => {
  return new StorageIndexAdapter<AgentExecutionSettings, AgentExecutionProperties>(
    esClient,
    logger,
    storageSettings
  );
};

export interface AgentExecutionRepository {
  get(executionId: string): Promise<AgentExecution | undefined>;
  create(execution: AgentExecution): Promise<void>;
}

export const createRepository = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): AgentExecutionRepository => {
  const storage = createStorage({ logger, esClient });

  return {
    get: async (executionId) => {
      const response = await storage.getClient().search({
        track_total_hits: false,
        size: 1,
        terminate_after: 1,
        query: {
          bool: {
            filter: [{ term: { executionId } }],
          },
        },
      });
      const hits = response.hits.hits;
      return hits.length > 0 ? hits[0]._source : undefined;
    },
    create: async (execution) => {
      const { executionId } = execution;
      await storage.getClient().index({
        id: executionId,
        document: execution,
      });
    },
  };
};
