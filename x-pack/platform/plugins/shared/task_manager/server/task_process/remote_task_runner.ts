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
import type { TaskProcessRunRequest, TaskProcessRunResponse } from './wire';

/** Where a run goes: its address, and the bearer token the process requires. */
export interface TaskProcessAddress {
  url: string;
  token?: string;
}

/** An address held for the length of a run; releasing it stops a process Kibana started. */
export interface TaskProcessLease extends TaskProcessAddress {
  release(): void;
}

/**
 * A remote process Kibana reaches at a fixed address, or a process Kibana starts when a run needs it:
 * `acquire` starts it if it is not running, and rejects if it cannot be started.
 */
export type TaskProcessRoute = TaskProcessAddress | { acquire: () => Promise<TaskProcessLease> };

/** Where a task type runs when it is not run in this process. */
export interface TaskProcessDispatch {
  /** The route of a task type, or nothing when it runs in this process. */
  getRoute(taskType: string): TaskProcessRoute | undefined;
  /** The Kibana version dispatching the run; a process built from another version refuses it. */
  kibanaVersion: string;
}

const authHeaders = (address: TaskProcessAddress): Record<string, string> =>
  address.token ? { authorization: `Bearer ${address.token}` } : {};

/** How long Kibana waits past a task's timeout for the process to answer before giving up. */
const DEADLINE_GRACE_MS = 5000;
/** How soon a task is retried when its process could not be reached or refused the run. */
const UNAVAILABLE_RETRY_MS = 5000;

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

const processUnavailable = (message: string) =>
  createRetryableError(new Error(message), new Date(Date.now() + UNAVAILABLE_RETRY_MS));

/**
 * Drop-in for the `{ run, cancel }` object `definition.createTaskRunner(...)` returns: the run
 * happens in a task process, and the result or error is rebuilt so Task Manager's own
 * `processResult` handles it exactly as it would a local run.
 */
export class RemoteTaskRunner implements CancellableTask {
  constructor(
    private readonly params: {
      route: TaskProcessRoute;
      request: Omit<TaskProcessRunRequest, 'deadline'>;
      /** The task's timeout; the process is told to stop, and Kibana stops waiting, shortly after. */
      timeoutMs: number;
      /** Aborted when Task Manager cancels the run. */
      signal?: AbortSignal;
      setCustomTaskRunEventFields: (fields: Record<string, unknown>) => void;
      /**
       * Runs the task in this process instead. Used when the process does not serve the task type, for
       * example a connector type that needs privileges only Kibana can check.
       */
      fallback?: () => CancellableTask;
      fetchFn?: typeof fetch;
    }
  ) {}

  private local?: CancellableTask;
  private target?: TaskProcessAddress;

  public async run(): Promise<RunResult | undefined | void> {
    const { route, request, timeoutMs, signal, setCustomTaskRunEventFields } = this.params;
    const fetchFn = this.params.fetchFn ?? fetch;

    let lease: TaskProcessLease | undefined;
    let address: TaskProcessAddress;
    if ('acquire' in route) {
      try {
        lease = await route.acquire();
      } catch (error) {
        // The process cannot be started: Kibana runs the task itself, as it always can.
        if (this.params.fallback) {
          this.local = this.params.fallback();
          return await this.local.run();
        }
        throw processUnavailable(`Task process could not be started: ${(error as Error).message}`);
      }
      address = lease;
    } else {
      address = route;
    }
    this.target = address;
    const deadline = new Date(Date.now() + timeoutMs);
    const { signal: abort, dispose } = abortAfter(timeoutMs + DEADLINE_GRACE_MS, signal);
    try {
      let response: Response;
      try {
        response = await fetchFn(`${address.url}/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders(address) },
          body: JSON.stringify({
            ...request,
            deadline: deadline.toISOString(),
          } satisfies TaskProcessRunRequest),
          signal: abort,
          ...(this.params.fetchFn ? {} : { dispatcher: getLongRunDispatcher() }),
        } as RequestInit);
      } catch (error) {
        // Timed out or cancelled: Task Manager's own timeout handling owns that outcome.
        if (abort.aborted) throw error;
        throw processUnavailable(
          `Task process ${address.url} is unreachable: ${(error as Error).message}`
        );
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        const message = `Task process ${address.url} responded ${response.status} to /run`;
        // The process does not serve this task type: run it here when we can.
        if (response.status === 404 && this.params.fallback) {
          this.local = this.params.fallback();
          return await this.local.run();
        }
        // The process is busy, draining, or does not serve this task type (yet): try again shortly.
        if (response.status === 503 || response.status === 404 || response.status === 409) {
          throw processUnavailable(message);
        }
        throw new Error(message);
      }
      const body = (await response.json()) as TaskProcessRunResponse;
      if (body.customTaskRunEventFields) {
        setCustomTaskRunEventFields(body.customTaskRunEventFields);
      }
      if (body.kind === 'thrown') {
        throw deserializeTaskRunError(body.error);
      }
      return deserializeRunResult(body.result);
    } finally {
      dispose();
      lease?.release();
    }
  }

  public async cancel() {
    if (this.local) {
      return this.local.cancel?.();
    }
    const { request } = this.params;
    const address = this.target;
    // Not started yet: nothing to cancel.
    if (!address) return;
    const fetchFn = this.params.fetchFn ?? fetch;
    try {
      const { signal, dispose } = abortAfter(DEADLINE_GRACE_MS);
      try {
        await fetchFn(`${address.url}/cancel/${request.executionUuid}`, {
          method: 'POST',
          headers: authHeaders(address),
          signal,
        });
      } finally {
        dispose();
      }
    } catch {
      // The process may be gone; Task Manager's own timeout handling already owns the outcome.
    }
  }
}
