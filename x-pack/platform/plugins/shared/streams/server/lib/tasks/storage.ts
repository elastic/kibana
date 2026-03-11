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
      id: types.keyword(),
      type: types.keyword(),
      status: types.keyword(),
      stream: types.keyword(),
      space: types.keyword(),
      created_at: types.date(),
      last_completed_at: types.date(),
      last_acknowledged_at: types.date(),
      last_canceled_at: types.date(),
      last_failed_at: types.date(),
      // Workaround for https://github.com/elastic/kibana/issues/245974
      task: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;
export type TaskStorageSettings = typeof taskStorageSettings;

export type TaskStorageClient = IStorageClient<TaskStorageSettings, PersistedTask>;
