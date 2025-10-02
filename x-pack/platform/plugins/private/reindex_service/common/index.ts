/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  IndexWarningType,
  IndexWarning,
  QueueSettings,
  ReindexOptions,
  ReindexStatusResponse,
  ReindexOperation,
  ReindexOperationCancelResponse,
} from './types';
export { ReindexStep } from './types';

import type { IndicesIndexSettingsKeys } from '@elastic/elasticsearch/lib/api/types';

export type IndexSettings = Partial<Pick<IndicesIndexSettingsKeys, 'mode'>>;

export interface ReindexArgs {
  indexName: string;
  newIndexName: string;
  reindexOptions?: {
    enqueue?: boolean;
    deleteOldIndex?: boolean;
  };
  settings?: IndexSettings;
}

export type BatchReindexArgs = Omit<ReindexArgs, 'reindexOptions'> & {
  reindexOptions?: Omit<ReindexArgs['reindexOptions'], 'enqueue'>;
};

export const REINDEX_SERVICE_BASE_PATH = '/api/reindex_service/reindex';
