/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import type { KibanaCall } from './context';
import type { WorkflowRunSummary } from './types';

const POLL_INTERVAL_MS = 5000;

const TERMINAL = new Set<string>(TerminalExecutionStatuses);

interface Execution {
  id: string;
  status: string;
  error?: { message?: string } | string | null;
  duration?: number;
  context?: { output?: Record<string, unknown> };
}

const workflowPath = (workflowId: string) =>
  `/api/workflows/workflow/${encodeURIComponent(workflowId)}`;

const errorOf = ({ error }: Execution): string | undefined =>
  !error ? undefined : typeof error === 'string' ? error : error.message ?? JSON.stringify(error);

/** Waits until no execution of the workflow is in progress, so a manual run is not dropped. */
export const waitForIdle = async (
  kibana: KibanaCall,
  workflowId: string,
  timeoutMs: number,
  pollIntervalMs = POLL_INTERVAL_MS
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await kibana<{ results: Execution[] }>(
      'GET',
      `${workflowPath(workflowId)}/executions?size=10`
    );
    if (!data.results.some(({ status }) => !TERMINAL.has(status))) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(`Workflow ${workflowId} still has a run in progress`);
    }
    await sleep(pollIntervalMs);
  }
};

/** Runs a workflow and waits for the run to end. */
export const runWorkflow = async (
  kibana: KibanaCall,
  workflowId: string,
  inputs: Record<string, unknown>,
  timeoutMs: number,
  pollIntervalMs = POLL_INTERVAL_MS
): Promise<WorkflowRunSummary> => {
  const {
    data: { workflowExecutionId: executionId },
  } = await kibana<{ workflowExecutionId: string }>('POST', `${workflowPath(workflowId)}/run`, {
    inputs,
  });
  const deadline = Date.now() + timeoutMs;
  const started = Date.now();
  for (;;) {
    await sleep(pollIntervalMs);
    const { data: execution } = await kibana<Execution>(
      'GET',
      `/api/workflows/executions/${encodeURIComponent(executionId)}`
    );
    if (TERMINAL.has(execution.status)) {
      return {
        workflowId,
        executionId,
        status: execution.status,
        durationMs: execution.duration ?? Date.now() - started,
        output: execution.context?.output,
        error: errorOf(execution),
      };
    }
    if (Date.now() > deadline) {
      return {
        workflowId,
        executionId,
        status: 'timed_out',
        durationMs: Date.now() - started,
        error: `Still ${execution.status} after ${Math.round(timeoutMs / 60_000)} minutes`,
      };
    }
  }
};

/** How many sources a dreaming run read: rounds, memories or excerpts, by workflow. */
export const sourcesReadBy = (output: Record<string, unknown> | undefined): number => {
  for (const key of ['rounds', 'memories', 'excerpts']) {
    const value = Number(output?.[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

/**
 * Runs a dreaming workflow until it has read everything: the first run from `since`, each later
 * run from where the last completed one stopped, until one reads nothing. A run that does not
 * complete is run again, `retries` times in a row at most: dreaming resumes from the last
 * completed run, and what a failed run wrote is updated rather than written twice.
 */
export const runUntilDone = async ({
  kibana,
  workflowId,
  since,
  maxRuns,
  retries,
  timeoutMs,
  pollIntervalMs = POLL_INTERVAL_MS,
  onRun,
}: {
  kibana: KibanaCall;
  workflowId: string;
  since?: string;
  maxRuns: number;
  retries: number;
  timeoutMs: number;
  pollIntervalMs?: number;
  onRun: (summary: WorkflowRunSummary, run: number) => void;
}): Promise<WorkflowRunSummary[]> => {
  const runs: WorkflowRunSummary[] = [];
  let completed = 0;
  let failuresInARow = 0;
  for (let run = 1; run <= maxRuns; run++) {
    await waitForIdle(kibana, workflowId, timeoutMs, pollIntervalMs);
    const inputs = completed === 0 && since ? { since } : {};
    const summary = await runWorkflow(kibana, workflowId, inputs, timeoutMs, pollIntervalMs);
    runs.push(summary);
    onRun(summary, run);
    if (summary.status !== 'completed') {
      failuresInARow++;
      if (failuresInARow > retries) {
        break;
      }
      continue;
    }
    completed++;
    failuresInARow = 0;
    if (sourcesReadBy(summary.output) === 0) {
      break;
    }
  }
  return runs;
};
