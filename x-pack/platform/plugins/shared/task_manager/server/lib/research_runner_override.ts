/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (workload isolation Track 7.A) — never merge.
 * A process-wide seam that lets a research plugin substitute the runner created for a task type
 * (e.g. a stub that dispatches the real runner to an isolate). The override is consulted on every
 * run, so it can be toggled at runtime for same-boot A/B comparisons. Main keeps claiming, leases,
 * retries and result persistence; only `createTaskRunner` is replaced.
 */

import type { RunContext, TaskRunCreatorFunction } from '../task';
import { isInterval, parseIntervalAsMillisecond } from './intervals';

export type ResearchRunnerOverride = (
  taskType: string,
  context: RunContext,
  original: TaskRunCreatorFunction
) => ReturnType<TaskRunCreatorFunction> | undefined;

const KEY = Symbol.for('kbn.research.taskManager.runnerOverride');
const COLLATERAL = Symbol.for('kbn.research.taskManager.collateralLoss');
interface Holder {
  [KEY]?: ResearchRunnerOverride;
}

/** A collateral loss may be rescheduled this many times without consuming an attempt. */
export const COLLATERAL_RESCHEDULE_CAP = 3;

/** Host maximum for abort grace. Longer values are clamped, not rejected, at this seam. */
export const CANCEL_GRACE_CAP_MS = 30_000;

/**
 * Floor when a task timeout is known. The fixed 2s host grace hard-stopped alerting's
 * cooperative cancel before rule execute events and the next action chunk were written.
 */
export const CANCEL_GRACE_FLOOR_MS = 10_000;

const clampCancelGrace = (ms: number): number => {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.min(CANCEL_GRACE_CAP_MS, Math.floor(ms));
};

/**
 * Cancel grace from a task-definition timeout. Known timeouts are at least
 * {@link CANCEL_GRACE_FLOOR_MS} and at most {@link CANCEL_GRACE_CAP_MS}.
 * An absent timeout keeps the caller fallback (the host default).
 */
export const deriveCancelGraceMs = (timeout: string | undefined, fallbackMs: number): number => {
  if (!timeout || !isInterval(timeout)) return clampCancelGrace(fallbackMs);
  try {
    const parsed = parseIntervalAsMillisecond(timeout);
    return clampCancelGrace(Math.max(parsed, CANCEL_GRACE_FLOOR_MS, fallbackMs));
  } catch {
    return clampCancelGrace(fallbackMs);
  }
};

/** Grace for a task type: the matching class, otherwise the definition timeout. */
export const resolveCancelGraceMs = (taskType: string, fallbackMs: number): number => {
  const match = classes.find((item) => (item.enabled?.() ?? true) && item.taskTypes(taskType));
  const configured = match?.cancelGraceMs;
  if (typeof configured === 'function') return clampCancelGrace(configured(taskType));
  if (typeof configured === 'number') return clampCancelGrace(configured);
  return deriveCancelGraceMs(researchDefinitionMeta(taskType)?.timeout, fallbackMs);
};

export interface ResearchExecutionClass {
  readonly id: string;
  readonly taskTypes: (taskType: string) => boolean;
  readonly enabled?: () => boolean;
  readonly aroundDispatch?: (
    context: RunContext,
    dispatch: () => Promise<unknown>
  ) => Promise<unknown>;
  /**
   * How long Task Manager's cancel may run in the worker before a hard stop.
   * A number is used as given (0–30000). A function should derive it from the task timeout.
   * Omitted classes use {@link deriveCancelGraceMs}.
   */
  readonly cancelGraceMs?: number | ((taskType: string) => number);
  readonly createRunner: (
    taskType: string,
    context: RunContext,
    original: TaskRunCreatorFunction
  ) => ReturnType<TaskRunCreatorFunction> | undefined;
}

export interface ResearchTaskDefinitionMeta {
  readonly type: string;
  readonly timeout: string;
  readonly maxAttempts?: number;
  readonly cost?: string | number;
  readonly priority?: string | number;
  readonly stateSchemaVersions: readonly number[];
}

interface DefinitionSource {
  get: (type: string) =>
    | {
        type: string;
        timeout: string;
        maxAttempts?: number;
        cost?: unknown;
        priority?: unknown;
        stateSchemaByVersion?: Record<number, unknown>;
      }
    | undefined;
}

const classes: ResearchExecutionClass[] = [];
const collateralCounts = new Map<string, number>();
let definitionSource: DefinitionSource | undefined;

/** Installs (or clears with undefined) the research runner override. */
export const setResearchRunnerOverride = (override: ResearchRunnerOverride | undefined): void => {
  (globalThis as Holder)[KEY] = override;
};

/** Registers a workload class. A later registration with the same id replaces it. */
export const registerExecutionClass = (registration: ResearchExecutionClass): void => {
  const index = classes.findIndex((item) => item.id === registration.id);
  if (index >= 0) classes.splice(index, 1, registration);
  else classes.push(registration);
};

/** Clears class registrations. Tests only. */
export const resetResearchExecutionClasses = (): void => {
  classes.length = 0;
};

/** Points definition parity at Task Manager's registry. */
export const setResearchTaskDefinitionSource = (source: DefinitionSource | undefined): void => {
  definitionSource = source;
};

/** Metadata Task Manager stored for a type, for the worker parity check. */
export const researchDefinitionMeta = (type: string): ResearchTaskDefinitionMeta | undefined => {
  const definition = definitionSource?.get(type);
  if (!definition) return undefined;
  return {
    type: definition.type,
    timeout: definition.timeout,
    maxAttempts: definition.maxAttempts,
    cost: definition.cost as ResearchTaskDefinitionMeta['cost'],
    priority: definition.priority as ResearchTaskDefinitionMeta['priority'],
    stateSchemaVersions: Object.keys(definition.stateSchemaByVersion ?? {})
      .map(Number)
      .sort((left, right) => left - right),
  };
};

/** Names the fields that differ. An empty array means the worker may run those types. */
export const diffDefinitionParity = (
  main: readonly ResearchTaskDefinitionMeta[],
  worker: readonly ResearchTaskDefinitionMeta[]
): string[] => {
  const byType = new Map(worker.map((item) => [item.type, item]));
  const mismatches: string[] = [];
  for (const expected of main) {
    const item = byType.get(expected.type);
    if (!item) {
      mismatches.push(`${expected.type} missing on worker`);
      continue;
    }
    for (const field of ['timeout', 'maxAttempts', 'cost', 'priority'] as const) {
      if (String(expected[field] ?? '') !== String(item[field] ?? '')) {
        mismatches.push(`${expected.type} ${field}`);
      }
    }
    if (expected.stateSchemaVersions.join(',') !== [...item.stateSchemaVersions].join(',')) {
      mismatches.push(`${expected.type} stateSchemaVersions`);
    }
  }
  return mismatches;
};

/** Marks an error as a run lost because another run in the same slot was stopped. */
export const markCollateralLoss = (error: Error): Error => {
  (error as Error & { [COLLATERAL]?: true })[COLLATERAL] = true;
  return error;
};

export const isCollateralLoss = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { [COLLATERAL]?: boolean })[COLLATERAL] === true;

/**
 * Refunds the attempt the claim already consumed, up to {@link COLLATERAL_RESCHEDULE_CAP}
 * times per task id in this process. The offending run is not marked and consumes its attempt.
 */
export const consumeCollateralReschedule = (
  taskId: string,
  error: unknown
): { readonly refunded: boolean; readonly count: number } => {
  const count = collateralCounts.get(taskId) ?? 0;
  if (!isCollateralLoss(error)) return { refunded: false, count };
  if (count >= COLLATERAL_RESCHEDULE_CAP) return { refunded: false, count };
  collateralCounts.set(taskId, count + 1);
  return { refunded: true, count: count + 1 };
};

/** Island boot is inside the claim, not the rule timeout. Cold boot measured ~4s. */
export const RESEARCH_BOOTSTRAP_DEADLINE_MS = 30_000;

/** Main's rolling recovery window. A persisted reclaim must not outlive this. */
export const RESEARCH_RECOVERY_CAP_MS = 5 * 60 * 1000;

/** Delay Task Manager uses when no research lease is armed yet. */
export const RESEARCH_RETRY_INTERVAL_MS = 60_000;

interface ResearchLease {
  readonly taskType: string;
  readonly claimedAt: number;
  readonly bootstrapMs: number;
  readonly executionMs: number;
  executionStartedAt?: number;
}

const leases = new Map<string, ResearchLease>();
const renewals = new Map<string, Set<() => void>>();

/** Runs when execution_start moves the persisted retryAt. The runner writes that date immediately. */
export const subscribeResearchLeaseRenewal = (taskId: string, renew: () => void): (() => void) => {
  const set = renewals.get(taskId) ?? new Set<() => void>();
  set.add(renew);
  renewals.set(taskId, set);
  return () => {
    set.delete(renew);
    if (set.size === 0) renewals.delete(taskId);
  };
};

/**
 * Arms a lease once. A later call from the worker stub must not reset the claim clock.
 */
export const armResearchLease = (lease: {
  readonly taskId: string;
  readonly taskType?: string;
  readonly claimedAt: number;
  readonly bootstrapMs: number;
  readonly executionMs: number;
}): void => {
  if (!lease.taskId || leases.has(lease.taskId)) return;
  leases.set(lease.taskId, {
    taskType: lease.taskType ?? '',
    claimedAt: lease.claimedAt,
    bootstrapMs: lease.bootstrapMs,
    executionMs: lease.executionMs,
  });
};

/** Once. A second packet must not move the execution clock or fire another renewal. */
export const markResearchExecutionStarted = (taskId: string, at = Date.now()): void => {
  const lease = leases.get(taskId);
  if (!lease || lease.executionStartedAt !== undefined) return;
  lease.executionStartedAt = at;
  for (const renew of [...(renewals.get(taskId) ?? [])]) renew();
};

/**
 * While booting, the document stays claimed through bootstrap plus the rule budget.
 * After execution_start, the rule budget is `at + executionMs`.
 */
export const researchExpiration = (taskId: string): Date | undefined => {
  const lease = leases.get(taskId);
  if (!lease) return undefined;
  const at =
    lease.executionStartedAt === undefined
      ? lease.claimedAt + lease.bootstrapMs + lease.executionMs
      : lease.executionStartedAt + lease.executionMs;
  return new Date(at);
};

export const clearResearchLease = (taskId: string): void => {
  leases.delete(taskId);
  renewals.delete(taskId);
};

/**
 * Rule timeout. An ad-hoc task with `timeoutOverride` uses that duration.
 * A scheduled task uses the definition timeout.
 */
export const researchExecutionBudgetMs = (
  taskType: string,
  fallbackMs: number,
  timeoutOverride?: string
): number => {
  const timeout =
    timeoutOverride && isInterval(timeoutOverride)
      ? timeoutOverride
      : researchDefinitionMeta(taskType)?.timeout;
  if (!timeout || !isInterval(timeout)) return fallbackMs;
  try {
    return parseIntervalAsMillisecond(timeout);
  } catch {
    return fallbackMs;
  }
};

const enabledClass = (taskType: string): ResearchExecutionClass | undefined =>
  classes.find((item) => (item.enabled?.() ?? true) && item.taskTypes(taskType));

/**
 * Claim-time retryAt for a routed task. Arms the lease before the document is
 * visible as running. The hold is bootstrap plus cancel grace, and never
 * longer than {@link RESEARCH_RECOVERY_CAP_MS}. The rule budget starts at execution_start.
 */
export const researchClaimRetryAt = (
  task: {
    readonly id: string;
    readonly taskType: string;
    readonly schedule?: unknown;
    readonly timeoutOverride?: string | null;
  },
  now = Date.now()
): Date | undefined => {
  if (!enabledClass(task.taskType)) return undefined;
  const executionMs = researchExecutionBudgetMs(
    task.taskType,
    0,
    task.schedule ? undefined : task.timeoutOverride ?? undefined
  );
  if (!executionMs) return undefined;
  armResearchLease({
    taskId: task.id,
    taskType: task.taskType,
    claimedAt: now,
    bootstrapMs: RESEARCH_BOOTSTRAP_DEADLINE_MS,
    executionMs,
  });
  const grace = resolveCancelGraceMs(task.taskType, 0);
  const hold = Math.min(RESEARCH_BOOTSTRAP_DEADLINE_MS + grace, RESEARCH_RECOVERY_CAP_MS);
  return new Date(now + hold);
};

/**
 * Document retryAt while the lease is held. Boot and the stop window both include
 * one cancel grace, still capped at the recovery window. The local expiry clock does not.
 */
export const researchPersistedRetryAt = (taskId: string, now = Date.now()): Date | undefined => {
  const lease = leases.get(taskId);
  if (!lease) return undefined;
  const grace = resolveCancelGraceMs(lease.taskType, 0);
  const target =
    lease.executionStartedAt === undefined
      ? lease.claimedAt + lease.bootstrapMs + grace
      : lease.executionStartedAt + lease.executionMs + grace;
  return new Date(Math.min(target, now + RESEARCH_RECOVERY_CAP_MS));
};

/** 0 when the claim already armed a lease, otherwise Task Manager's 60s interval. */
export const researchFirstRetryDelayMs = (taskId: string): number =>
  researchExpiration(taskId) ? 0 : RESEARCH_RETRY_INTERVAL_MS;

/**
 * Attempts written back after a failure. A collateral loss refunds one, up to the cap.
 */
export const researchPersistedAttempts = (
  taskId: string,
  attempts: number,
  error: unknown
): number => {
  const collateral = consumeCollateralReschedule(taskId, error);
  return collateral.refunded ? Math.max(attempts - 1, 0) : attempts;
};

/** Creates the task runner. An execution class wins, then the legacy override, then the real runner. */
export const createTaskRunnerWithResearchOverride = (
  taskType: string,
  original: TaskRunCreatorFunction,
  context: RunContext
): ReturnType<TaskRunCreatorFunction> => {
  const match = classes.find((item) => (item.enabled?.() ?? true) && item.taskTypes(taskType));
  if (match) {
    const runner = match.createRunner(taskType, context, original);
    if (runner) {
      if (!match.aroundDispatch) return runner;
      const dispatch = runner.run.bind(runner);
      return {
        ...runner,
        run: () => match.aroundDispatch!(context, dispatch) as ReturnType<typeof dispatch>,
      };
    }
  }
  const override = (globalThis as Holder)[KEY];
  return override?.(taskType, context, original) ?? original(context);
};
