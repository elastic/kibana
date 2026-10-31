/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { OBSERVABLES_INDEX_NAME } from '../../common/constants';

/** How an observable reached the case. `migration` and `import` are written by the sync pass and import repair. */
export type ObservableSource =
  | 'api'
  | 'auto_extract'
  | 'workflow'
  | 'agent'
  | 'migration'
  | 'import';

export interface ObservableDocument {
  case_id: string;
  space_id: string;
  owner: string;
  type_key: string;
  value: string;
  description?: string;
  /** The id callers already know, when it differs from the document `_id`. */
  legacy_id?: string;
  source: ObservableSource;
  created_at: string;
  updated_at: string;
}

const storageSettings = {
  name: OBSERVABLES_INDEX_NAME,
  schema: {
    properties: {
      case_id: types.keyword({}),
      space_id: types.keyword({}),
      owner: types.keyword({}),
      type_key: types.keyword({}),
      value: types.keyword({}),
      description: types.text({}),
      legacy_id: types.keyword({}),
      source: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

type ObservablesStorageSettings = typeof storageSettings;

export type ObservablesStorage = StorageIndexAdapter<
  ObservablesStorageSettings,
  ObservableDocument
>;
export type ObservablesStorageClient = ReturnType<ObservablesStorage['getClient']>;

/** The adapter creates the index lazily on the first write, so creating it here installs nothing. */
export const createObservablesStorage = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ObservablesStorage =>
  new StorageIndexAdapter<ObservablesStorageSettings, ObservableDocument>(
    esClient,
    logger,
    storageSettings
  );
