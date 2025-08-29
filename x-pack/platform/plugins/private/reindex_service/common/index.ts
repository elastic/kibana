/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// todo - ones not marked used can be moved to plugin
export type {
  IndexWarningType, // used
  IndexWarning, // used
  QueueSettings,
  ReindexOptions,
  ReindexStatusResponse, // used
  ReindexOperation,
  ReindexOperationCancelResponse,
  ReindexSavedObject,
} from './types';
// yes to these
export { ReindexStep, ReindexStatus } from './types';

import type { IndicesIndexSettingsKeys } from '@elastic/elasticsearch/lib/api/types';

export type IndexSettings = Partial<Pick<IndicesIndexSettingsKeys, 'mode'>>;

export interface ReindexArgs {
  indexName: string;
  newIndexName: string;
  reindexOptions?: {
    enqueue?: boolean;
  };
  settings?: IndexSettings;
}
