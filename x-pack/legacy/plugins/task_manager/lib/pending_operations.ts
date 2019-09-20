/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface PendingOperations<T, S> {
  hasPendingTasks: boolean;
  pendingTasks: number;
  whenPendingTasksComplete(): Promise<void>;
  trackOperationOn(subject: T, pendingOperation: Promise<S>): Promise<S>;
  untrack(subject: T): void;
}

export function createPendingOperations<T, S>(): PendingOperations<T, S> {
  const pending: Map<T, Promise<S>> = new Map();
  const resolveOnEmpty: Array<() => void> = [];
  return {
    get hasPendingTasks() {
      return pending.size > 0;
    },
    get pendingTasks() {
      return pending.size;
    },
    whenPendingTasksComplete() {
      return this.hasPendingTasks
        ? new Promise(resolve => {
            resolveOnEmpty.push(resolve);
          })
        : Promise.resolve();
    },
    untrack(subject: T) {
      if (pending.has(subject)) {
        pending.delete(subject);
      }
      if (!this.hasPendingTasks) {
        resolveOnEmpty.splice(0, resolveOnEmpty.length).forEach(resolve => resolve());
      }
    },
    trackOperationOn(subject: T, pendingOperation: Promise<S>) {
      pending.set(subject, pendingOperation);
      return pendingOperation;
    },
  };
}
