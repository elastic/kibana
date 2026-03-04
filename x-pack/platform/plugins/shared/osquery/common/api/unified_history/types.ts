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
  successCount: number | undefined;
  errorCount: number | undefined;
  totalRows: number | undefined;
  queriesWithResults?: number;
  queriesTotal?: number;
  userId?: string;
  userProfileUid?: string;
  actionId?: string;
  scheduleId?: string;
  executionCount?: number;
  ecsMapping?: Record<string, unknown>;
  savedQueryId?: string;
  timeout?: number;
  agentIds?: string[];
  agentAll?: boolean;
  agentPlatforms?: string[];
  agentPolicyIds?: string[];
}

export interface UnifiedHistoryResponse {
  rows: UnifiedHistoryRow[];
  nextCursor?: string;
  nextActionsCursor?: string;
  nextScheduledCursor?: string;
  nextScheduledOffset?: number;
  hasMore: boolean;
}
