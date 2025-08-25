/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AgentType, ToolSelection } from '@kbn/onechat-common';
import { chatSystemIndex } from '@kbn/onechat-server';

export const agentsIndexName = chatSystemIndex('agents');

const storageSettings = {
  name: agentsIndexName,
  schema: {
    properties: {
      name: types.keyword({}),
      type: types.keyword({}),
      description: types.text({}),
      labels: types.keyword({}),
      avatar_color: types.keyword({}),
      avatar_symbol: types.keyword({}),
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
  labels?: string[];
  avatar_color?: string;
  avatar_symbol?: string;
  configuration: {
    instructions?: string;
    tools: ToolSelection[];
  };
  created_at: string;
  updated_at: string;
}

export type AgentProfileStorageSettings = typeof storageSettings;

// @ts-expect-error type mismatch for labels type
export type AgentProfileStorage = StorageIndexAdapter<AgentProfileStorageSettings, AgentProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): AgentProfileStorage => {
  // @ts-expect-error type mismatch for labels type
  return new StorageIndexAdapter<AgentProfileStorageSettings, AgentProperties>(
    esClient,
    logger,
    storageSettings
  );
};
