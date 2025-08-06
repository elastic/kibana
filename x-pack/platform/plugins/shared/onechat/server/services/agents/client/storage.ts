/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexStorageSettings, StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AgentType, ToolSelection } from '@kbn/onechat-common';

export const agentProfilesIndexName = '.kibana_onechat_agents';

const storageSettings = {
  name: agentProfilesIndexName,
  schema: {
    properties: {
      name: types.keyword({}),
      type: types.keyword({}),
      description: types.text({}),
      configuration: types.object({ dynamic: true }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface AgentProperties {
  name: string;
  type: AgentType;
  description: string;
  configuration: {
    instructions?: string;
    tools: ToolSelection[];
  };
  created_at: string;
  updated_at: string;
}

export type AgentProfileStorageSettings = typeof storageSettings;

export type AgentProfileStorage = StorageIndexAdapter<AgentProfileStorageSettings, AgentProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentProfileStorage => {
  return new StorageIndexAdapter<AgentProfileStorageSettings, AgentProperties>(
    esClient,
    logger,
    storageSettings
  );
};
