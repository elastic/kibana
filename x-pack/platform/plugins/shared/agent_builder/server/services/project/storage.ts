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
import type { ProjectType } from '@kbn/agent-builder-common';

export const projectIndexName = chatSystemIndex('projects');

const storageSettings = {
  name: projectIndexName,
  schema: {
    properties: {
      title: types.text({}),
      type: types.keyword({}),
      case_id: types.keyword({}),
      case_owner: types.keyword({}),
      members: types.keyword({}),
      conversation_ids: types.keyword({}),
      user_id: types.keyword({}),
      user_name: types.keyword({}),
      space: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface ProjectProperties {
  title: string;
  type: ProjectType;
  case_id?: string;
  case_owner?: string;
  members: string[];
  conversation_ids: string[];
  user_id?: string;
  user_name: string;
  space: string;
  created_at: string;
  updated_at: string;
}

export type ProjectStorageSettings = typeof storageSettings;

export type ProjectStorage = StorageIndexAdapter<ProjectStorageSettings, ProjectProperties>;

export const createProjectStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ProjectStorage => {
  return new StorageIndexAdapter<ProjectStorageSettings, ProjectProperties>(
    esClient,
    logger,
    storageSettings
  );
};
