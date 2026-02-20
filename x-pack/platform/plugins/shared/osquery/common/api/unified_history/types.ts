/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type UnifiedHistoryRowType = 'live' | 'scheduled';
export type UnifiedHistorySource = 'Live' | 'Scheduled' | 'Rule';
export type SourceFilter = 'live' | 'rule' | 'scheduled';

export interface UnifiedHistoryRow {
  id: string;
  rowType: UnifiedHistoryRowType;
  timestamp: string;
  queryText: string;
  queryName?: string;
  source: UnifiedHistorySource;
  packName?: string;
  packId?: string;
  agentCount: number;
  successCount: number;
  errorCount: number;
  totalRows: number;
  userId?: string;
  actionId?: string;
  scheduleId?: string;
  executionCount?: number;
}

export interface UnifiedHistoryResponse {
  rows: UnifiedHistoryRow[];
  nextCursor?: string;
  nextActionsCursor?: string;
  nextScheduledCursor?: string;
  hasMore: boolean;
}
