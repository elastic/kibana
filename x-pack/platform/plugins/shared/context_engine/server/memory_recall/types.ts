/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallResult, RecallSource } from '../../common/http_api/memory_recall';

export interface RecallSearchParams {
  query: string;
  limit: number;
  userId?: string;
  sessionIds?: string[];
  aiIndexIds?: string[];
}

/** One store Recall searches. */
export interface RecallStore {
  source: RecallSource;
  search(params: RecallSearchParams): Promise<RecallResult[]>;
}
