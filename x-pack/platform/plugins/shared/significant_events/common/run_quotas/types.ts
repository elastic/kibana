/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Daily run quotas for Significant Events background activity.
 *
 * Three engines present the settings; a *budget group* is what actually carries
 * a number. A group is a set of managed workflows that share one counter, so
 * limits stay meaningful without exposing one number per workflow.
 *
 * Deliberately free of `@kbn/workflows` imports so the browser bundle does not
 * pull in the managed workflow YAML. The group -> workflow id mapping lives in
 * `server/lib/run_quotas/budget_groups.ts`.
 */

export const RUN_QUOTA_ENGINE_IDS = ['context', 'detection', 'investigation'] as const;

export type RunQuotaEngineId = (typeof RUN_QUOTA_ENGINE_IDS)[number];

export const RUN_BUDGET_GROUP_IDS = [
  'ki_extraction',
  'memory',
  'detection',
  'investigation',
] as const;

export type RunBudgetGroupId = (typeof RUN_BUDGET_GROUP_IDS)[number];

/** Which engine presents (and pauses) each budget group. */
export const RUN_BUDGET_GROUP_ENGINE: Readonly<Record<RunBudgetGroupId, RunQuotaEngineId>> = {
  ki_extraction: 'context',
  memory: 'context',
  detection: 'detection',
  investigation: 'investigation',
};

/** Groups belonging to an engine, in presentation order. */
export const RUN_BUDGET_GROUPS_BY_ENGINE: Readonly<
  Record<RunQuotaEngineId, readonly RunBudgetGroupId[]>
> = {
  context: ['ki_extraction', 'memory'],
  detection: ['detection'],
  investigation: ['investigation'],
};

/**
 * Defaults cap day-to-day automation at 20 runs per group. This is the
 * settled product decision (2026-08-06); adjusted after observing real
 * customer-0 cluster run rates.
 */
export const DEFAULT_RUN_LIMITS: Readonly<Record<RunBudgetGroupId, number>> = {
  ki_extraction: 20,
  memory: 20,
  detection: 20,
  investigation: 20,
};

export const MIN_RUN_LIMIT = 1;
export const MAX_RUN_LIMIT = 10_000;

/** IANA time zone the daily window is rounded in. */
export const DEFAULT_RUN_QUOTA_TIME_ZONE = 'UTC';

export interface RunLimit {
  /** When false the group is uncapped and the gate never stops a run. */
  enabled: boolean;
  /** Maximum runs admitted per calendar day. */
  max: number;
}

export interface RunQuotaSettings {
  /** IANA time zone used to round the daily window. Deployment-wide. */
  timezone: string;
  limits: Record<RunBudgetGroupId, RunLimit>;
}

/** The calendar day the reported usage was counted over. */
export interface RunQuotaWindow {
  /** Inclusive start of the current day, as an ISO timestamp. */
  start: string;
  /** When `used` returns to zero, as an ISO timestamp. */
  resetsAt: string;
  timezone: string;
}

export interface RunBudgetGroupUsage {
  group: RunBudgetGroupId;
  engine: RunQuotaEngineId;
  limit: RunLimit;
  /** Runs admitted in the current window, all origins included. */
  used: number;
  /** Runs left before automation is stopped, or `null` when uncapped. */
  remaining: number | null;
  /** True once automated runs are being refused. Never true when uncapped. */
  exhausted: boolean;
  /** `used` broken down by the `triggered_by` of each recorded run. */
  byTrigger: Record<string, number>;
}

export interface RunQuotasResponse {
  settings: RunQuotaSettings;
  window: RunQuotaWindow;
  groups: RunBudgetGroupUsage[];
  /**
   * True when the run ledger could not be read, so `used` is reported as zero.
   * The in-workflow gate fails open the same way, so nothing is being blocked.
   */
  ledgerUnavailable: boolean;
}

export const DEFAULT_RUN_QUOTA_SETTINGS: RunQuotaSettings = {
  timezone: DEFAULT_RUN_QUOTA_TIME_ZONE,
  limits: {
    ki_extraction: { enabled: true, max: DEFAULT_RUN_LIMITS.ki_extraction },
    memory: { enabled: true, max: DEFAULT_RUN_LIMITS.memory },
    detection: { enabled: true, max: DEFAULT_RUN_LIMITS.detection },
    investigation: { enabled: true, max: DEFAULT_RUN_LIMITS.investigation },
  },
};

/**
 * Origins that count as a person asking for the run. These are never gated —
 * a human is never blocked — though they do consume budget like any other run.
 * Anything else (`scheduled`, `workflow-step`, `alert`, or an origin added
 * later) is treated as automation, so the gate fails closed for new callers.
 *
 * Kept in sync with the `quota_evaluate` step of the gated workflow
 * definitions by `run_quota_gate.test.ts`.
 */
export const HUMAN_RUN_ORIGINS = [
  'manual',
  'sigevents-investigation-ui',
  'significant-events-memory-ui',
] as const;

export type HumanRunOrigin = (typeof HUMAN_RUN_ORIGINS)[number];

export const isHumanRunOrigin = (origin: string): origin is HumanRunOrigin =>
  (HUMAN_RUN_ORIGINS as readonly string[]).includes(origin);
