/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { types, type IndexStorageSettings, type IStorageClient } from '@kbn/storage-adapter';
import type { PersistedTask } from './types';

export const taskStorageSettings = {
  name: '.kibana_streams_tasks',
  schema: {
    properties: {
      // Do I really want to index this?
      id: types.keyword(),
      status: types.keyword(),
      payload: types.object({ enabled: false }),
      error: types.keyword(),
    },
  },
} satisfies IndexStorageSettings;
export type TaskStorageSettings = typeof taskStorageSettings;

export type TaskStorageClient = IStorageClient<TaskStorageSettings, PersistedTask>;
