/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  SML_INDEX_AUGMENTATION_WORKFLOW_ID,
  SML_INDEX_CRAWL_LIST_STEP,
  SML_INDEX_CRAWL_WORKFLOW_ID,
  type SmlSystemWorkflowProgress,
} from '../../common/constants';

/**
 * Step type used by `workflow.execute` (synchronous child workflow
 * invocation). The crawl's `foreach` spawns one of these per index — counting
 * them gives `completed` / detecting the in-flight one gives `currentIndex`.
 *
 * Hard-coded rather than imported from `@kbn/workflows` to keep this helper
 * free of cross-package dependencies; the literal is stable (it's the YAML
 * step `type:` users write in their workflows).
 */
const WORKFLOW_EXECUTE_STEP_TYPE = 'workflow.execute';

/**
 * Step execution statuses that mean "this step is no longer running" — used
 * to count completed augmentations in the crawl workflow's progress summary.
 *
 * We treat `failed`, `cancelled`, and `skipped` as completed because the
 * crawl explicitly opts into `iteration-on-failure: continue: true` and we
 * don't want a single failing index to forever pin the counter at "N/M
 * completed" with N stuck below total. The UI surfaces the workflow's
 * overall status separately.
 */
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'skipped']);

/**
 * In-flight status set (anything that's actively executing or about to). Used
 * to find "the current step" in an augmentation workflow and "the current
 * index" in a crawl workflow. Includes `waiting` because a parent
 * `workflow.execute` step sits in that state while its spawned child runs.
 */
const ACTIVE_STATUSES = new Set(['running', 'pending', 'waiting_for_input', 'waiting']);

/**
 * Compute a progress payload for one of the bundled SML system workflow
 * executions, or `undefined` if the execution does not correspond to a known
 * SML workflow (e.g. user replaced the document at the same id with a
 * different YAML).
 *
 * The two strategies are intentionally distinct:
 *
 *  - **Crawl** progress derives entirely from the parent's *own* step
 *    executions: the foreach iterations show up as repeated
 *    `workflow.execute` step entries, so counting their statuses gives an
 *    accurate `completed / total` ratio. `total` comes from the
 *    `list_indices` Elasticsearch step output once it has produced one.
 *    `currentIndex` is read from the rendered `input.inputs.indexPattern`
 *    of whichever `workflow.execute` step is still in flight.
 *
 *  - **Augmentation** progress reports the resolved `indexPattern` (so the
 *    crawl's child runs are individually identifiable in the UI) and the
 *    step id of the most recent in-flight step (best-effort fallback to the
 *    most recently *started* step if every step is already terminal).
 *
 * The function is total: every code path must return either a typed
 * `SmlSystemWorkflowProgress` or `undefined`. It must never throw — the route
 * handler treats progress as best-effort metadata, not a critical payload.
 *
 * Note: the caller MUST request `getWorkflowExecution(..., { includeInput:
 * true, includeOutput: true })`. Without those flags the workflows API
 * strips step `input` and `output`, leaving `total`/`currentIndex` blank
 * even though the workflow is making progress.
 */
export const computeSmlWorkflowProgress = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): SmlSystemWorkflowProgress | undefined => {
  const workflowId = execution.workflowId;
  if (workflowId === SML_INDEX_CRAWL_WORKFLOW_ID) {
    return computeCrawlProgress(execution);
  }
  if (workflowId === SML_INDEX_AUGMENTATION_WORKFLOW_ID) {
    return computeAugmentationProgress(execution);
  }
  return undefined;
};

const computeCrawlProgress = (execution: WorkflowExecutionDto): SmlSystemWorkflowProgress => {
  const steps = execution.stepExecutions ?? [];
  const total = readListIndicesTotal(steps);

  // Each foreach iteration spawns one `workflow.execute` step execution on
  // the parent. We don't filter by stepId here — that would require knowing
  // the user-defined name (`run_augmentation`) — because filtering by
  // stepType is more robust against future template renames.
  const executeSteps = steps.filter((step) => step.stepType === WORKFLOW_EXECUTE_STEP_TYPE);
  const completed = executeSteps.filter((step) => TERMINAL_STATUSES.has(step.status)).length;

  // Pick the most-recently started in-flight `workflow.execute` step (there
  // is usually only one, but workflows can opt into parallel foreach
  // iterations). Its rendered `input.inputs.indexPattern` is the index
  // currently being augmented.
  const inFlight = executeSteps
    .filter((step) => ACTIVE_STATUSES.has(step.status))
    .sort(compareStarted);
  const currentStep = inFlight.length ? inFlight[inFlight.length - 1] : undefined;
  const currentIndex = currentStep ? readStepIndexPattern(currentStep) : null;

  return {
    kind: 'crawl',
    total,
    completed,
    currentIndex,
  };
};

const computeAugmentationProgress = (
  execution: WorkflowExecutionDto
): SmlSystemWorkflowProgress => {
  const indexPattern = readAugmentationIndexPattern(execution);
  const currentStep = pickCurrentStepId(execution.stepExecutions);
  return {
    kind: 'augmentation',
    indexPattern,
    currentStep,
  };
};

/**
 * Read the index pattern an augmentation execution is processing.
 *
 * The workflow declares a single `indexPattern` input, so the resolved value
 * is the most reliable source. Different code paths land it in slightly
 * different places depending on how the execution was scheduled:
 *
 *   - Manual run from the SML admin page → `context.inputs.indexPattern`.
 *   - Spawned by the crawl via `workflow.execute` → also
 *     `context.inputs.indexPattern`, but during early scheduling the parent
 *     may have only populated `context.workflow.inputs` instead. We probe
 *     both.
 *
 * Falls back to scanning any `with.inputs.indexPattern` value found in the
 * step executions (e.g. on the synthetic `enterWorkflow` step) before giving
 * up and returning `null`.
 */
const readAugmentationIndexPattern = (execution: WorkflowExecutionDto): string | null => {
  const ctx = execution.context as Record<string, unknown> | undefined;
  const direct = pickString(ctx?.inputs, 'indexPattern');
  if (direct !== null) return direct;
  const nested = pickString(
    (ctx?.workflow as Record<string, unknown> | undefined)?.inputs,
    'indexPattern'
  );
  if (nested !== null) return nested;
  for (const step of execution.stepExecutions ?? []) {
    const fromInput = readStepIndexPattern(step);
    if (fromInput !== null) return fromInput;
  }
  return null;
};

/**
 * Read `inputs.indexPattern` from a step execution's rendered input. Returns
 * `null` when the step has no `input.inputs.indexPattern` (e.g. when the
 * input has been stripped because the caller forgot `includeInput: true`).
 */
const readStepIndexPattern = (step: WorkflowStepExecutionDto): string | null => {
  const input = step.input as Record<string, unknown> | undefined;
  return pickString(input?.inputs, 'indexPattern');
};

/**
 * Read `list_indices.output.length` when that step has produced an array
 * output. Returns `null` if the list step has not run yet (or produced a
 * non-array body, e.g. an error response) so the UI can render `?/—` until
 * the total becomes known.
 */
const readListIndicesTotal = (
  stepExecutions: WorkflowStepExecutionDto[] | undefined
): number | null => {
  if (!stepExecutions) return null;
  // The foreach iteration counter would also work, but `list_indices.output`
  // is authoritative whether or not iterations have started. We pick the
  // most-recently started `list_indices` step to be robust against retries.
  let chosen: WorkflowStepExecutionDto | undefined;
  for (const step of stepExecutions) {
    if (step.stepId !== SML_INDEX_CRAWL_LIST_STEP) continue;
    if (!chosen || compareStarted(step, chosen) > 0) {
      chosen = step;
    }
  }
  if (!chosen) return null;
  const output = chosen.output;
  if (Array.isArray(output)) return output.length;
  return null;
};

/**
 * Pick the step id to display as "currently running" in an augmentation
 * workflow:
 *
 *   1. Latest active step (`running`/`pending`/`waiting*`) if any.
 *   2. Otherwise the most recently started step.
 *
 * Returns `null` for fresh executions with no recorded step executions yet.
 */
const pickCurrentStepId = (
  stepExecutions: WorkflowStepExecutionDto[] | undefined
): string | null => {
  if (!stepExecutions?.length) return null;
  const active = stepExecutions
    .filter((s) => ACTIVE_STATUSES.has(s.status))
    .sort(compareStarted);
  if (active.length) return active[active.length - 1].stepId;
  const mostRecent = [...stepExecutions].sort(compareStarted);
  return mostRecent.length ? mostRecent[mostRecent.length - 1].stepId : null;
};

/**
 * Stable, ISO-timestamp comparator. Newer steps sort later. Falls back to
 * `globalExecutionIndex` when `startedAt` is missing or identical so retries
 * within the same millisecond still order deterministically.
 */
const compareStarted = (a: WorkflowStepExecutionDto, b: WorkflowStepExecutionDto): number => {
  const aStart = a.startedAt ?? '';
  const bStart = b.startedAt ?? '';
  if (aStart !== bStart) return aStart < bStart ? -1 : 1;
  return (a.globalExecutionIndex ?? 0) - (b.globalExecutionIndex ?? 0);
};

/** Read a string value at `bag[key]`, returning `null` when missing or non-string. */
const pickString = (bag: unknown, key: string): string | null => {
  if (!bag || typeof bag !== 'object') return null;
  const value = (bag as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};
