/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';

export const datasetsIndexName = 'kibana-evaluation-datasets' as const;

export const datasetsStorageSettings = {
  name: datasetsIndexName,
  schema: {
    properties: {
      name: types.keyword({}),
      description: types.text({}),
      versions: types.object({ dynamic: false, properties: {} }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export interface DatasetVersionEntry {
  tag: string;
  created_at: string;
  examples_count: number;
}

export interface DatasetStorageProperties {
  name: string;
  description: string;
  versions?: DatasetVersionEntry[];
  created_at: string;
  updated_at: string;
}
