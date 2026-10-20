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

export type ResearchRunnerOverride = (
  taskType: string,
  context: RunContext,
  original: TaskRunCreatorFunction
) => ReturnType<TaskRunCreatorFunction> | undefined;

const KEY = Symbol.for('kbn.research.taskManager.runnerOverride');
interface Holder {
  [KEY]?: ResearchRunnerOverride;
}

/** Installs (or clears with undefined) the research runner override. */
export const setResearchRunnerOverride = (override: ResearchRunnerOverride | undefined): void => {
  (globalThis as Holder)[KEY] = override;
};

/** Creates the task runner, letting an installed research override take precedence. */
export const createTaskRunnerWithResearchOverride = (
  taskType: string,
  original: TaskRunCreatorFunction,
  context: RunContext
): ReturnType<TaskRunCreatorFunction> => {
  const override = (globalThis as Holder)[KEY];
  return override?.(taskType, context, original) ?? original(context);
};
