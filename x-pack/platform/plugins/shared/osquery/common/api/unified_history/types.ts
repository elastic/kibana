/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type UnifiedHistorySourceType = 'live' | 'scheduled';
export type UnifiedHistorySource = 'Live' | 'Scheduled' | 'Rule';
export type SourceFilter = 'live' | 'rule' | 'scheduled';

interface UnifiedHistoryRowBase {
  id: string;
  timestamp: string;
  queryText: string;
  queryName?: string;
  packName?: string;
  packId?: string;
  spaceId?: string;
  agentCount: number;
  successCount: number | undefined;
  errorCount: number | undefined;
  totalRows: number | undefined;
}

export interface LiveHistoryRow extends UnifiedHistoryRowBase {
  sourceType: 'live';
  source: 'Live' | 'Rule';
  actionId?: string;
  userId?: string;
  userProfileUid?: string;
  queriesWithResults?: number;
  queriesTotal?: number;
  ecsMapping?: Record<string, unknown>;
  savedQueryId?: string;
  timeout?: number;
  agentIds?: string[];
  agentAll?: boolean;
  agentPlatforms?: string[];
  agentPolicyIds?: string[];
}

export interface ScheduledHistoryRow extends UnifiedHistoryRowBase {
  sourceType: 'scheduled';
  source: 'Scheduled';
  scheduleId: string;
  executionCount: number;
  plannedTime?: string;
}

export type UnifiedHistoryRow = LiveHistoryRow | ScheduledHistoryRow;

export interface UnifiedHistoryResponse {
  data: UnifiedHistoryRow[];
  nextPage?: string;
  hasMore: boolean;
}

export interface DecodedCursor {
  actionSearchAfter?: Array<string | number>;
  scheduledCursor?: string;
  scheduledOffset?: number;
}
