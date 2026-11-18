/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import { combineMetricCollections, decodeMetricScopes } from '@kbn/metrics';
import type { ScopeMetrics } from '@kbn/metrics';
import { captureTaskRunTrace } from '../task_running/task_tracing';
import type { TaskExecutionPool } from '../task_scheduling';
import type { CancellableTask, ConcreteTaskInstance, RemoteRunObserver, RunResult } from '../task';
import {
  createRetryableError,
  DeclinedRunError,
  deserializeTaskRunError,
  throwUnrecoverableError,
} from '../task_running/errors';
import { TaskProcessAcquireError } from './acquire_error';
import {
  parseTaskFeatureFlagDeclarations,
  assertTaskFeatureFlagValues,
  type TaskFeatureFlagDefinitions,
} from './feature_flag_declarations';
import {
  parseTaskProcessProtocol,
  TASK_PROCESS_PATHS,
  TASK_PROCESS_PROTOCOL_VERSION,
} from './protocol';
import type { TaskProcessDispatchFailureReason } from './dispatch_failure_counter';
import { DECLINED_STATUS, deserializeRunResult, MAX_TIMER_MS } from './wire';
import type {
  TaskProcessDispatchSnapshot,
  TaskProcessRunRequest,
  TaskProcessRunResponse,
  TaskProcessRunMetrics,
  TaskProcessMetricSnapshot,
} from './wire';

/** Where a run goes: its address, and the bearer token the process requires. */
export interface TaskProcessAddress {
  url: string;
  token?: string;
}

/** An address held for one run; releasing it retires the child or returns it to the idle pool. */
export interface TaskProcessLease extends TaskProcessAddress {
  release(options?: { force?: boolean; reusable?: boolean }): void;
}

/**
 * A remote process Kibana reaches at a fixed address, or a process Kibana starts when a run needs it:
 * `acquire` starts it if it is not running, and rejects if it cannot be started.
 */
export type TaskProcessRoute =
  | TaskProcessAddress
  | { acquire: (context?: TaskProcessAcquireContext) => Promise<TaskProcessLease> };

export interface TaskProcessAcquireContext {
  executionUuid?: string;
  snapshot?: TaskProcessDispatchSnapshot;
}

/** Where a task type runs when it is not run in this process. */
export interface TaskProcessDispatch {
  /** The route of a task type, or nothing when it runs in this process. */
  getRoute(taskType: string): TaskProcessRoute | undefined;
  /** The Kibana version dispatching the run; a process built from another version refuses it. */
  kibanaVersion: string;
  /** The values of the feature flags a task type declares, for the run being dispatched. */
  getFeatureFlags?: (
    taskType: string,
    declarations?: TaskFeatureFlagDefinitions
  ) => Promise<TaskProcessRunRequest['featureFlags']>;
  /** `taskInstance` is the run being dispatched, read by `TaskTypeRegistrationOptions.getPacks`. */
  getSnapshot?: (
    taskType: string,
    taskInstance: ConcreteTaskInstance
  ) => Promise<TaskProcessDispatchSnapshot>;
  getCurrentTasksInPool?: TaskExecutionPool['getCurrentTasksInPool'];
  onTasksCreated?: (count: number) => void;
  onMetrics?: (metrics: ScopeMetrics[]) => void;
  getCancelGracePeriodMs?: (taskType: string) => number | undefined;
  /** Called when dispatch fails; the task remains assigned to process execution. */
  onDispatchFailure?: (
    taskType: string,
    reason: TaskProcessDispatchFailureReason,
    detail?: string
  ) => void;
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
      request: Omit<TaskProcessRunRequest, 'deadline' | 'protocolVersion'>;
      /** The task's timeout; the process is told to stop, and Kibana stops waiting, shortly after. */
      timeoutMs: number;
      /** Aborted when Task Manager cancels the run. */
      signal?: AbortSignal;
      setCustomTaskRunEventFields: (fields: Record<string, unknown>) => void;
      /** Told when dispatch fails, and why. */
      onDispatchFailure?: TaskProcessDispatch['onDispatchFailure'];
      /** What the task type counts in Kibana's memory of the runs a process served. */
      observer?: RemoteRunObserver;
      getCurrentTasksInPool?: TaskExecutionPool['getCurrentTasksInPool'];
      getFeatureFlags?: TaskProcessDispatch['getFeatureFlags'];
      onTasksCreated?: (count: number) => void;
      onMetrics?: (metrics: ScopeMetrics[]) => void;
      fetchFn?: typeof fetch;
    }
  ) {}

  private reportedCreatedTaskCount = 0;
  private reportedMetrics?: TaskProcessMetricSnapshot;
  private cancelled = false;
  private target?: TaskProcessAddress | TaskProcessLease;
  private cancellation?: Promise<void>;
  private retriedWithEveryPack = false;

  /**
   * A worker dispatched with a narrowed pack selection (`init.packs`) that declines the run is asked
   * once more with no pack selection at all (`onDispatchFailure` already reports the first, declined
   * attempt), so Main's incomplete pack resolution costs a slower run instead of a failed one. A
   * worker that was already asked for every pack keeps today's behavior: the decline is unrecoverable.
   */
  public async run(): Promise<RunResult | undefined | void> {
    try {
      return await this.attempt();
    } catch (error) {
      const packs = this.params.request.snapshot?.init.packs;
      if (!this.retriedWithEveryPack && packs !== undefined && error instanceof DeclinedRunError) {
        this.retriedWithEveryPack = true;
        return this.attempt(true);
      }
      throw error;
    }
  }

  private async attempt(loadEveryPack?: boolean): Promise<RunResult | undefined | void> {
    const {
      route,
      request: originalRequest,
      timeoutMs,
      signal,
      setCustomTaskRunEventFields,
    } = this.params;
    const request: Omit<TaskProcessRunRequest, 'deadline'> = {
      ...originalRequest,
      protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
      tracing: originalRequest.tracing ?? captureTaskRunTrace(),
      ...(loadEveryPack && originalRequest.snapshot
        ? {
            snapshot: {
              ...originalRequest.snapshot,
              init: { ...originalRequest.snapshot.init, packs: undefined },
            },
          }
        : {}),
    };
    signal?.throwIfAborted();
    if (this.cancelled)
      throw createRetryableError(new Error('Task process run was cancelled'), false);
    const deadline = new Date(Date.now() + timeoutMs);
    const fetchFn = this.params.fetchFn ?? fetch;

    let lease: TaskProcessLease | undefined;
    let address: TaskProcessAddress;
    if ('acquire' in route) {
      try {
        lease = await route.acquire({
          executionUuid: request.executionUuid,
          snapshot: request.snapshot,
        });
      } catch (error) {
        this.params.onDispatchFailure?.(
          request.taskType,
          error instanceof TaskProcessAcquireError ? error.reason : 'unavailable',
          `the process could not be started: ${(error as Error).message}`
        );
        if (
          error instanceof TaskProcessAcquireError &&
          (error.reason === 'not_served' || error.reason === 'incompatible')
        ) {
          throwUnrecoverableError(error);
        }
        throw processUnavailable(`Task process could not be started: ${(error as Error).message}`);
      }
      address = lease;
    } else {
      address = route;
    }
    if (this.cancelled || signal?.aborted || deadline.getTime() <= Date.now()) {
      lease?.release({ force: true });
      signal?.throwIfAborted();
      throw createRetryableError(
        new Error('Task process run was cancelled or timed out before dispatch'),
        false
      );
    }
    this.target = address;
    const { signal: abort, dispose } = abortAfter(
      deadline.getTime() - Date.now() + DEADLINE_GRACE_MS,
      signal
    );
    let reusable = false;
    let stopControl = (): void => {};
    try {
      let response: Response;
      try {
        const health = await fetchFn(`${address.url}${TASK_PROCESS_PATHS.health}`, {
          headers: authHeaders(address),
          signal: abort,
        });
        if (!health.ok) {
          await health.body?.cancel();
          if (health.status === 503) {
            throw processUnavailable('Task worker is unavailable for protocol negotiation');
          }
          throw new TaskProcessAcquireError(
            'incompatible',
            `Task worker protocol negotiation returned HTTP ${health.status}`
          );
        }
        parseTaskProcessProtocol(await health.text());
        if (this.params.getFeatureFlags) {
          const declarationsResponse = await fetchFn(
            `${address.url}${TASK_PROCESS_PATHS.featureFlags}?taskType=${encodeURIComponent(
              request.taskType
            )}`,
            { headers: authHeaders(address), signal: abort }
          );
          if (!declarationsResponse.ok) {
            await declarationsResponse.body?.cancel();
            if (declarationsResponse.status >= 500)
              throw processUnavailable('Task worker feature flag declarations are unavailable');
            throw new TaskProcessAcquireError(
              declarationsResponse.status === 404 ? 'not_served' : 'incompatible',
              `Task worker feature flag negotiation returned HTTP ${declarationsResponse.status}`
            );
          }
          const declared = parseTaskFeatureFlagDeclarations(
            await declarationsResponse.text(),
            request.taskType
          );
          abort.throwIfAborted();
          let removeAbortListener = () => {};
          const cancelled = new Promise<never>((_resolve, reject) => {
            const onAbort = () => reject(abort.reason);
            abort.addEventListener('abort', onAbort, { once: true });
            removeAbortListener = () => abort.removeEventListener('abort', onAbort);
          });
          let values: TaskProcessRunRequest['featureFlags'];
          try {
            values = await Promise.race([
              this.params.getFeatureFlags(request.taskType, declared),
              cancelled,
            ]);
          } finally {
            removeAbortListener();
          }
          assertTaskFeatureFlagValues(values, declared);
          request.featureFlags = values;
          if (request.snapshot) request.snapshot = { ...request.snapshot, featureFlags: values };
        }
        if (this.cancelled || abort.aborted) {
          throw createRetryableError(
            new Error('Task process run was cancelled before dispatch'),
            false
          );
        }
        stopControl = this.startControlPolling(address);
        response = await fetchFn(`${address.url}${TASK_PROCESS_PATHS.run}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders(address) },
          body: JSON.stringify({
            ...request,
            // Acquired children already received initialization secrets over IPC.
            ...('acquire' in route ? { snapshot: undefined } : {}),
            deadline: deadline.toISOString(),
          } satisfies TaskProcessRunRequest),
          signal: abort,
          ...(this.params.fetchFn ? {} : { dispatcher: getLongRunDispatcher() }),
        } as RequestInit);
      } catch (error) {
        // Timed out or cancelled: Task Manager's own timeout handling owns that outcome.
        if (abort.aborted || this.cancelled) throw error;
        if (
          error instanceof TaskProcessAcquireError &&
          (error.reason === 'incompatible' || error.reason === 'not_served')
        ) {
          this.params.onDispatchFailure?.(request.taskType, error.reason, error.message);
          throwUnrecoverableError(error);
        }
        this.params.onDispatchFailure?.(
          request.taskType,
          'unavailable',
          'Task process is unreachable'
        );
        throw processUnavailable(
          `Task process ${address.url} is unreachable: ${(error as Error).message}`
        );
      }
      if (!response.ok) {
        // A process that declines says why, which is what to alarm on.
        let reason: string | undefined;
        let incompatible = false;
        if (response.status === DECLINED_STATUS) {
          const failure = (await response.json().catch(() => undefined)) as
            | {
                kind?: string;
                reason?: string;
                createdTaskCount?: number;
                prometheus?: TaskProcessMetricSnapshot;
              }
            | undefined;
          reason = failure?.reason;
          incompatible = failure?.kind === 'incompatible';
          this.reportCreatedTasks(failure?.createdTaskCount);
          this.reportMetrics(failure?.prometheus);
        } else {
          await response.body?.cancel().catch(() => undefined);
        }
        const message = `Task process ${address.url} responded ${response.status} to ${
          TASK_PROCESS_PATHS.run
        }${reason ? `: ${reason}` : ''}`;
        if (response.status === 404 || response.status === DECLINED_STATUS) {
          this.params.onDispatchFailure?.(
            request.taskType,
            response.status === DECLINED_STATUS
              ? incompatible
                ? 'incompatible'
                : 'declined'
              : 'not_served',
            reason ?? message
          );
          if (response.status === DECLINED_STATUS && !incompatible) {
            throwUnrecoverableError(new DeclinedRunError(message));
          }
          throwUnrecoverableError(new Error(message));
        }
        this.params.onDispatchFailure?.(request.taskType, 'unavailable', message);
        // A busy or draining process can serve the task on a later attempt.
        if (response.status === 503) {
          throw processUnavailable(message);
        }
        throwUnrecoverableError(new Error(message));
      }
      const body = (await response.json()) as TaskProcessRunResponse;
      this.reportCreatedTasks(body.createdTaskCount);
      this.reportMetrics(body.prometheus);
      if (body.customTaskRunEventFields) {
        setCustomTaskRunEventFields(body.customTaskRunEventFields);
      }
      if (body.kind === 'thrown') {
        throw deserializeTaskRunError(body.error);
      }
      const result = deserializeRunResult(body.result);
      reusable = body.reusable === true && !body.result?.error && !body.result?.taskRunError;
      // A run Kibana cancelled is not counted as run, as when Kibana runs it itself.
      if (!this.cancelled) this.observe((observer) => observer.onResult?.(result));
      return result;
    } finally {
      stopControl();
      dispose();
      if (abort.aborted || this.cancelled) await this.cancel();
      else lease?.release({ reusable });
    }
  }

  private reportMetrics(snapshot: TaskProcessMetricSnapshot | undefined): void {
    if (!snapshot) return;
    if (
      !Number.isSafeInteger(snapshot.sequence) ||
      snapshot.sequence < 1 ||
      typeof snapshot.encoded !== 'string'
    ) {
      throw new Error('Task worker returned invalid native metric metadata');
    }
    if (snapshot.sequence <= (this.reportedMetrics?.sequence ?? 0)) return;
    if (!this.params.onMetrics) throw new Error('Task dispatch has no native Prometheus receiver');
    const delta = combineMetricCollections(
      this.reportedMetrics ? decodeMetricScopes(this.reportedMetrics.encoded) : [],
      decodeMetricScopes(snapshot.encoded),
      'subtract'
    );
    this.params.onMetrics(delta);
    this.reportedMetrics = snapshot;
  }

  private reportCreatedTasks(count: number | undefined): void {
    if (
      !Number.isSafeInteger(count) ||
      count === undefined ||
      count <= this.reportedCreatedTaskCount
    )
      return;
    const delta = count - this.reportedCreatedTaskCount;
    this.reportedCreatedTaskCount = count;
    this.params.onTasksCreated?.(delta);
  }

  private startControlPolling(address: TaskProcessAddress): () => void {
    if (!this.params.onTasksCreated && !this.params.getCurrentTasksInPool && !this.params.onMetrics)
      return () => {};
    const controller = new AbortController();
    let pending = false;
    const timer = setInterval(async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await (this.params.fetchFn ?? fetch)(
          `${address.url}${TASK_PROCESS_PATHS.metrics}${this.params.request.executionUuid}`,
          {
            headers: authHeaders(address),
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1000)]),
          }
        );
        if (!response.ok) {
          await response.body?.cancel();
          return;
        }
        const metrics = (await response.json()) as TaskProcessRunMetrics;
        this.reportCreatedTasks(metrics.createdTaskCount);
        this.reportMetrics(metrics.prometheus);
        const getPool = this.params.getCurrentTasksInPool;
        if (getPool) {
          for (const requestId of metrics.activePoolRequestIds ?? []) {
            const executionIds = await getPool();
            controller.signal.throwIfAborted();
            const reply = await (this.params.fetchFn ?? fetch)(
              `${address.url}${TASK_PROCESS_PATHS.activePool}${this.params.request.executionUuid}`,
              {
                method: 'POST',
                headers: { ...authHeaders(address), 'content-type': 'application/json' },
                body: JSON.stringify({ requestId, executionIds }),
                signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
              }
            );
            await reply.body?.cancel();
          }
        }
      } catch {
        // Counts are reconciled by the final response; unanswered pool requests fail in the worker.
      } finally {
        pending = false;
      }
    }, 1000);
    timer.unref?.();
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }

  /** What the type counts must never fail a run. */
  private observe(call: (observer: RemoteRunObserver) => void) {
    try {
      if (this.params.observer) call(this.params.observer);
    } catch (error) {
      // Counting is best effort.
    }
  }

  public async cancel() {
    const { request } = this.params;
    const address = this.target;
    const wasCancelled = this.cancelled;
    this.cancelled = true;
    // Not started yet: nothing to cancel.
    if (!address) return;
    if (!wasCancelled) {
      this.observe((observer) => observer.onCancel?.());
    }
    if ('release' in address && !request.cancelGracePeriodMs) {
      address.release({ force: true });
      return;
    }
    return (this.cancellation ??= this.cancelTarget(address));
  }

  private async cancelTarget(address: TaskProcessAddress | TaskProcessLease): Promise<void> {
    const { request } = this.params;
    const fetchFn = this.params.fetchFn ?? fetch;
    try {
      const { signal, dispose } = abortAfter(request.cancelGracePeriodMs ?? DEADLINE_GRACE_MS);
      try {
        const response = await fetchFn(
          `${address.url}${TASK_PROCESS_PATHS.cancel}${request.executionUuid}`,
          {
            method: 'POST',
            headers: authHeaders(address),
            signal,
          }
        );
        if (response.ok) {
          const metrics = (await response.json()) as TaskProcessRunMetrics;
          this.reportCreatedTasks(metrics.createdTaskCount);
          this.reportMetrics(metrics.prometheus);
        } else await response.body?.cancel();
      } finally {
        dispose();
      }
    } catch {
      // The process may be gone; Task Manager's own timeout handling already owns the outcome.
    } finally {
      if ('release' in address) address.release({ force: true });
    }
  }
}
