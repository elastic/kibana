/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RUN_BUDGET_GROUP_IDS = [
  'detection',
  'investigation',
  'ki_extraction',
  'memory',
] as const;

export type RunBudgetGroupId = (typeof RUN_BUDGET_GROUP_IDS)[number];

export const CONTROLLED_RUN_BUDGET_GROUP_IDS = [
  'detection',
  'investigation',
  'ki_extraction',
] as const;

export type ControlledRunBudgetGroupId = (typeof CONTROLLED_RUN_BUDGET_GROUP_IDS)[number];

export const WORKER_RUN_BUDGET_GROUP_IDS = ['detection', 'ki_extraction'] as const;

export type WorkerRunBudgetGroupId = (typeof WORKER_RUN_BUDGET_GROUP_IDS)[number];

export const MIN_RUN_LIMIT = 1;
export const MAX_RUN_LIMIT = 10_000;
export const DEFAULT_RUN_QUOTA_TIME_ZONE = 'UTC';

export type RunLimit = { enabled: false; max: 0 } | { enabled: true; max: number };

export const DEFAULT_RUN_LIMITS: Readonly<Record<RunBudgetGroupId, RunLimit>> = {
  detection: { enabled: true, max: 100 },
  investigation: { enabled: true, max: 30 },
  ki_extraction: { enabled: true, max: 20 },
  memory: { enabled: false, max: 0 },
};

export interface RunQuotaSettings {
  timezone: typeof DEFAULT_RUN_QUOTA_TIME_ZONE;
  limits: Record<RunBudgetGroupId, RunLimit>;
}

export const DEFAULT_RUN_QUOTA_SETTINGS: Readonly<RunQuotaSettings> = {
  timezone: DEFAULT_RUN_QUOTA_TIME_ZONE,
  limits: DEFAULT_RUN_LIMITS,
};

export interface RunQuotaWindow {
  start: string;
  resetsAt: string;
  timezone: typeof DEFAULT_RUN_QUOTA_TIME_ZONE;
}

export interface RunBudgetGroupUsage {
  group: RunBudgetGroupId;
  limit: RunLimit;
  used: number;
  counted: number;
  remaining: number | null;
  withinLimitGrantCount: number;
  criticalPastLimitGrantCount: number;
  totalSkipped: number;
  decisionsEvicted: boolean;
}

export interface RunQuotasResponse {
  settings: RunQuotaSettings;
  window: RunQuotaWindow;
  groups: RunBudgetGroupUsage[];
}

export type RunQuotaDriverHealthStatus = 'healthy' | 'degraded' | 'unknown' | 'not_applicable';

export interface RunQuotaDriverHealth {
  status: RunQuotaDriverHealthStatus;
  staleSpaceCount?: number;
  staleSpaceIds?: string[];
}

export interface RunQuotaStatusResponse {
  enabled: boolean;
  enabledAt?: string;
  enabledBy?: string;
  canManageLimits: boolean;
  driverHealth: Record<RunBudgetGroupId, RunQuotaDriverHealth>;
}

export interface RunQuotaLimitsUpdate {
  limits: Partial<Record<ControlledRunBudgetGroupId, RunLimit>>;
}

export interface RunQuotaEnforcementUpdate {
  enabled: boolean;
  limits?: Partial<Record<ControlledRunBudgetGroupId, RunLimit>>;
}

export interface RunQuotaHeartbeatResponse {
  recorded: boolean;
}

export interface RunQuotaConsumeResponse {
  allowed: boolean;
}

export type RunQuotaReserveReason = 'ineligible' | 'limit';

export interface RunQuotaReserveResponse {
  granted: boolean;
  pastLimit: boolean;
  reason?: RunQuotaReserveReason;
}

export interface RunQuotaSkippedEvent {
  eventUuid: string;
  eventId: string;
  severity: string;
  decidedAt: string;
}

export interface RunQuotaSkippedResponse {
  rows: RunQuotaSkippedEvent[];
  totalSkipped: number;
  truncated: boolean;
  decisionsEvicted: boolean;
}
