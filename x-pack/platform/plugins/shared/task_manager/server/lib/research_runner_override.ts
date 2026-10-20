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
        run: () => match.aroundDispatch!(context, dispatch),
      };
    }
  }
  const override = (globalThis as Holder)[KEY];
  return override?.(taskType, context, original) ?? original(context);
};
