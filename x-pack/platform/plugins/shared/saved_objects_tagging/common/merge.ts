/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration of a tag merge job: rewrite references from `fromIds` to `toId`,
 * optionally deleting `fromIds` once no references remain.
 */
export interface MergeJobConfig {
  toId: string;
  fromIds: string[];
  deleteSources: boolean;
}

export type MergeJobPhase = 'scanning' | 'updating' | 'finalizing' | 'complete';

export type MergeJobStatus = 'idle' | 'in_progress' | 'canceled' | 'success' | 'failed';

export interface MergeJobProgress {
  totalAffected?: number;
  updatedCount: number;
  percent?: number;
}

export interface MergeDeletionResult {
  id: string;
  deleted: boolean;
  remainingReferences?: number;
  error?: string;
}

export interface MergeErrorsSummary {
  count: number;
  samples: string[];
}

export interface MergeGateResult {
  allowed: boolean;
  reasons: string[];
}

export interface MergePreviewRequest {
  toId: string;
  fromIds: string[];
}

export interface MergePreviewResponse {
  affectedCount: number;
  byType: Record<string, number>;
  canStartMerge: MergeGateResult;
  canRequestDeleteSources: MergeGateResult;
}

export interface MergeAffectedObject {
  type: string;
  id: string;
  title?: string;
}

export interface MergePreviewObjectsResponse {
  objects: MergeAffectedObject[];
  total: number;
  page: number;
  perPage: number;
}

export type MergeStartRequest = MergeJobConfig;

export interface MergeStatusResponse {
  status: MergeJobStatus;
  phase: MergeJobPhase;
  job?: MergeJobConfig & { startedAt: string };
  progress: MergeJobProgress;
  deletion: MergeDeletionResult[];
  errors: MergeErrorsSummary;
}
