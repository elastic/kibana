/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RUN_QUOTA_GROUPS = ['detection', 'investigation', 'ki_extraction'] as const;

export type RunQuotaGroup = (typeof RUN_QUOTA_GROUPS)[number];

export const MIN_RUN_LIMIT = 0;
export const MAX_RUN_LIMIT = 10_000;
export const DEFAULT_RUN_QUOTA_TIME_ZONE = 'UTC';

export const DEFAULT_RUN_LIMITS: Readonly<Record<RunQuotaGroup, number>> = {
  detection: 100,
  investigation: 30,
  ki_extraction: 20,
};

export interface RunQuotaSettings {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
}

export const DEFAULT_RUN_QUOTA_SETTINGS: Readonly<RunQuotaSettings> = {
  enabled: false,
  limits: DEFAULT_RUN_LIMITS,
};

export interface RunQuotaWindow {
  start: string;
  resetsAt: string;
  timezone: typeof DEFAULT_RUN_QUOTA_TIME_ZONE;
}

export interface RunQuotasResponse {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
  counts: Record<RunQuotaGroup, number>;
  window: RunQuotaWindow;
  canManage: boolean;
}

export interface RunQuotaSettingsUpdate {
  enabled?: boolean;
  limits?: Partial<Record<RunQuotaGroup, number>>;
}

export type RunQuotaConsumeRequest =
  | { group: 'detection' }
  | { group: 'ki_extraction' }
  | { group: 'investigation'; critical: boolean };

export interface RunQuotaConsumeResponse {
  allowed: boolean;
}
