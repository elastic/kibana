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
      id: types.keyword({}),
      name: types.keyword({}),
      type: types.keyword({}),
      space: types.keyword({}),
      description: types.text({}),
      labels: types.keyword({}),
      avatar_color: types.keyword({}),
      avatar_symbol: types.keyword({}),
      config: types.object({ properties: {}, dynamic: false }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface AgentProperties {
  id: string;
  name: string;
  type: AgentType;
  space: string;
  description: string;
  labels?: string[];
  avatar_color?: string;
  avatar_symbol?: string;
  config: AgentConfigurationProperties;
  created_at: string;
  updated_at: string;
  // deprecated fields
  configuration?: AgentConfigurationProperties;
}

export interface AgentConfigurationProperties {
  instructions?: string;
  tools: ToolSelection[];
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
