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
import type { PluginManifestAuthor, UnmanagedPluginAssets } from '@kbn/agent-builder-common';

export const pluginIndexName = chatSystemIndex('plugins');

const storageSettings = {
  name: pluginIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      name: types.keyword({}),
      version: types.keyword({}),
      space: types.keyword({}),
      description: types.text({}),
      manifest: types.object({
        dynamic: false,
        properties: {},
      }),
      source_url: types.keyword({}),
      skill_ids: types.keyword({}),
      unmanaged_assets: types.object({
        dynamic: false,
        properties: {},
      }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface PluginManifestProperties {
  author?: PluginManifestAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export interface PluginProperties {
  id: string;
  name: string;
  version: string;
  space: string;
  description: string;
  manifest: PluginManifestProperties;
  source_url?: string;
  skill_ids: string[];
  unmanaged_assets: UnmanagedPluginAssets;
  created_at: string;
  updated_at: string;
}

export type PluginStorageSettings = typeof storageSettings;

export type PluginStorage = StorageIndexAdapter<PluginStorageSettings, PluginProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): PluginStorage => {
  return new StorageIndexAdapter<PluginStorageSettings, PluginProperties>(
    esClient,
    logger,
    storageSettings
  );
};
