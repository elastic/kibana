/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import type { CancellableTask, RunResult } from '../task';
import { createRetryableError, deserializeTaskRunError } from '../task_running/errors';
import { deserializeRunResult, MAX_TIMER_MS } from './wire';
import type { PodRunRequest, PodRunResponse } from './wire';

export interface PodRoute {
  url: string;
}

/** How long Kibana waits past a task's timeout for the pod to answer before giving up. */
const DEADLINE_GRACE_MS = 5000;
/** How soon a task is retried when its pod could not be reached or refused the run. */
const POD_UNAVAILABLE_RETRY_MS = 5000;

// A run can legitimately take longer than undici's default 5 minute header timeout; the task's own
// timeout (via the abort signal) is what bounds it.
let longRunDispatcher: Agent | undefined;
const getLongRunDispatcher = () =>
  (longRunDispatcher ??= new Agent({ headersTimeout: 0, bodyTimeout: 0 }));

/** An abort signal that fires after `ms`, or when `parent` aborts; `dispose` clears the timer. */
const abortAfter = (ms: number, parent?: AbortSignal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(ms, MAX_TIMER_MS));
  const onParentAbort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  parent?.addEventListener('abort', onParentAbort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onParentAbort);
    },
  };
};

const podUnavailable = (message: string) =>
  createRetryableError(new Error(message), new Date(Date.now() + POD_UNAVAILABLE_RETRY_MS));

/**
 * Drop-in for the `{ run, cancel }` object `definition.createTaskRunner(...)` returns: the run
 * happens in a pod process, and the result or error is rebuilt so Task Manager's own
 * `processResult` handles it exactly as it would a local run.
 */
export class RemoteTaskRunner implements CancellableTask {
  constructor(
    private readonly params: {
      pod: PodRoute;
      request: Omit<PodRunRequest, 'deadline'>;
      /** The task's timeout; the pod is told to stop, and Kibana stops waiting, shortly after. */
      timeoutMs: number;
      /** Aborted when Task Manager cancels the run. */
      signal?: AbortSignal;
      setCustomTaskRunEventFields: (fields: Record<string, unknown>) => void;
      /**
       * Runs the task in this process instead. Used when the pod does not serve the task type, for
       * example a connector type that needs privileges only Kibana can check.
       */
      fallback?: () => CancellableTask;
      fetchFn?: typeof fetch;
    }
  ) {}

  private local?: CancellableTask;

  public async run(): Promise<RunResult | undefined | void> {
    const { pod, request, timeoutMs, signal, setCustomTaskRunEventFields } = this.params;
    const fetchFn = this.params.fetchFn ?? fetch;
    const deadline = new Date(Date.now() + timeoutMs);
    const { signal: abort, dispose } = abortAfter(timeoutMs + DEADLINE_GRACE_MS, signal);
    try {
      let response: Response;
      try {
        response = await fetchFn(`${pod.url}/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...request,
            deadline: deadline.toISOString(),
          } satisfies PodRunRequest),
          signal: abort,
          ...(this.params.fetchFn ? {} : { dispatcher: getLongRunDispatcher() }),
        } as RequestInit);
      } catch (error) {
        // Timed out or cancelled: Task Manager's own timeout handling owns that outcome.
        if (abort.aborted) throw error;
        throw podUnavailable(`Task pod ${pod.url} is unreachable: ${(error as Error).message}`);
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        const message = `Task pod ${pod.url} responded ${response.status} to /run`;
        // The pod doesn't serve this task type: run it here when we can.
        if (response.status === 404 && this.params.fallback) {
          this.local = this.params.fallback();
          return await this.local.run();
        }
        // The pod is busy, draining, or doesn't serve this task type (yet): try again shortly.
        if (response.status === 503 || response.status === 404 || response.status === 409) {
          throw podUnavailable(message);
        }
        throw new Error(message);
      }
      const body = (await response.json()) as PodRunResponse;
      if (body.customTaskRunEventFields) {
        setCustomTaskRunEventFields(body.customTaskRunEventFields);
      }
      if (body.kind === 'thrown') {
        throw deserializeTaskRunError(body.error);
      }
      return deserializeRunResult(body.result);
    } finally {
      dispose();
    }
  }

  public async cancel() {
    if (this.local) {
      return this.local.cancel?.();
    }
    const { pod, request } = this.params;
    const fetchFn = this.params.fetchFn ?? fetch;
    try {
      const { signal, dispose } = abortAfter(DEADLINE_GRACE_MS);
      try {
        await fetchFn(`${pod.url}/cancel/${request.executionUuid}`, { method: 'POST', signal });
      } finally {
        dispose();
      }
    } catch {
      // The pod may be gone; Task Manager's own timeout handling already owns the outcome.
    }
  }
}
