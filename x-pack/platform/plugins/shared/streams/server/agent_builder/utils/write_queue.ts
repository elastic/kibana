/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * Process-global async serial queue that serializes write operations to avoid
 * lock contention on the global streams lock ('streams/apply_changes').
 *
 * A single instance is created in `registerAgentBuilderTools` and shared across
 * all concurrent agent runs on this Kibana node. In multi-instance deployments,
 * cross-node serialization is handled by the Streams API's own distributed lock.
 *
 * Multiple tool handlers may be dispatched concurrently by LangGraph's ToolNode
 * (via Promise.all). Confirmations happen in parallel before any write, but the
 * actual write calls are funnelled through this queue one at a time.
 */
export class StreamsWriteQueue {
  private queue: Promise<void> = Promise.resolve();

  /**
   * Enqueue a write operation. The returned promise resolves/rejects with the
   * operation's result once it has been executed.
   *
   * If an AbortSignal is provided and fires while the operation is still
   * waiting in the queue (not yet executing), the promise is rejected
   * immediately with an 'Operation cancelled' error and the operation is
   * skipped without taking its turn.
   */
  enqueue<T>(fn: () => Promise<T>, abortSignal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new Error('Operation cancelled'));

      if (abortSignal?.aborted) {
        reject(new Error('Operation cancelled'));
        return;
      }

      abortSignal?.addEventListener('abort', onAbort, { once: true });

      this.queue = this.queue.then(async () => {
        abortSignal?.removeEventListener('abort', onAbort);

        if (abortSignal?.aborted) {
          reject(new Error('Operation cancelled'));
          return;
        }

        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

/**
 * Derives an AbortSignal from the KibanaRequest lifecycle.
 * When the HTTP request is aborted (e.g. user navigates away or the agent run
 * is cancelled), the returned signal fires, allowing queued operations that
 * haven't started yet to be dropped.
 */
export const abortSignalFromRequest = (request: KibanaRequest): AbortSignal => {
  const controller = new AbortController();
  const sub = request.events.aborted$.subscribe(() => {
    controller.abort();
    sub.unsubscribe();
  });
  return controller.signal;
};
