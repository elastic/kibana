/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { Maybe, Inspect } from '../../common';
import type { RequestBasicOptions } from '..';

export type UnifiedHistoryRowType = 'live' | 'scheduled';
export type UnifiedHistorySource = 'Live' | 'Scheduled' | 'Rule';

export interface UnifiedHistoryRow {
  id: string;
  rowType: UnifiedHistoryRowType;
  timestamp: string;
  queryText: string;
  source: UnifiedHistorySource;
  packName?: string;
  packId?: string;
  agentCount: number;
  successCount: number;
  errorCount: number;
  totalRows: number;
  userId?: string;
  /** For live queries — the action_id. For scheduled — the schedule_id. */
  actionId: string;
  /** The schedule_id used in pack queries */
  scheduleId?: string;
  /** The execution cycle number (scheduled rows only) */
  executionCount?: number;
  /** Number of distinct queries in this execution */
  queryCount?: number;
}

export interface UnifiedHistoryRequestOptions extends RequestBasicOptions {
  pageSize: number;
  cursor?: string;
  spaceId: string;
}

export interface UnifiedHistoryStrategyResponse extends IEsSearchResponse {
  rows: UnifiedHistoryRow[];
  total: number;
  nextCursor?: string;
  inspect?: Maybe<Inspect>;
}
