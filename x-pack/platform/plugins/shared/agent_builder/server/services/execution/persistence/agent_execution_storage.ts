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
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecutionParams, ExecutionStatus, SerializedExecutionError } from '../types';

export const agentExecutionIndexName = chatSystemIndex('agent-executions');

const storageSettings = {
  name: agentExecutionIndexName,
  schema: {
    properties: {
      execution_id: types.keyword({}),
      '@timestamp': types.date({}),
      status: types.keyword({}),
      agent_id: types.keyword({}),
      space_id: types.keyword({}),
      agent_params: types.object({ dynamic: false, properties: {} }),
      error: types.object({
        dynamic: false,
        properties: {
          code: types.keyword({}),
          message: types.text({}),
        },
      }),
      event_count: types.long({}),
      events: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export interface AgentExecutionProperties {
  execution_id: string;
  '@timestamp': string;
  status: ExecutionStatus;
  agent_id: string;
  space_id: string;
  agent_params: AgentExecutionParams;
  error?: SerializedExecutionError;
  event_count?: number;
  events?: ChatEvent[];
}

export type AgentExecutionStorageSettings = typeof storageSettings;

export type AgentExecutionStorage = StorageIndexAdapter<
  AgentExecutionStorageSettings,
  AgentExecutionProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentExecutionStorage => {
  return new StorageIndexAdapter<AgentExecutionStorageSettings, AgentExecutionProperties>(
    esClient,
    logger,
    storageSettings
  );
};
