/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';

export const datasetExamplesIndexName = 'kibana-evaluation-dataset-examples' as const;

export const datasetExamplesStorageSettings = {
  name: datasetExamplesIndexName,
  schema: {
    properties: {
      dataset_id: types.keyword({}),
      input: types.object({ dynamic: false, properties: {} }),
      output: types.object({ dynamic: false, properties: {} }),
      metadata: types.object({ dynamic: false, properties: {} }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface DatasetExampleStorageProperties {
  dataset_id: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
