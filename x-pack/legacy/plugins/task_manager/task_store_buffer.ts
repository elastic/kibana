/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexBy, pluck } from 'lodash';
import { Subject } from 'rxjs';
import { bufferWhen, filter } from 'rxjs/operators';
import { Updatable } from './task_runner';
import { ConcreteTaskInstance } from './task';
import { isErr, Result } from './lib/result_type';

export interface BatchUpdatable extends Updatable {
  bulkUpdate(
    docs: ConcreteTaskInstance[]
  ): Promise<Array<Result<ConcreteTaskInstance, { task: ConcreteTaskInstance; error: any }>>>;
}

export function createTaskStoreUpdateBuffer(store: BatchUpdatable): Updatable {
  const flushBuffer = new Subject<any>();
  const storeUpdateBuffer = new Subject<{
    task: ConcreteTaskInstance;
    resolve: (value: ConcreteTaskInstance | PromiseLike<ConcreteTaskInstance>) => void;
    reject: (reason?: any) => void;
  }>();

  storeUpdateBuffer
    .pipe(
      bufferWhen(() => flushBuffer),
      filter(tasks => tasks.length > 0)
    )
    .subscribe(tasks => {
      const taskById = indexBy(tasks, ({ task: { id } }) => id);
      store
        .bulkUpdate(pluck(tasks, 'task'))
        .then(updateResult => {
          updateResult.forEach(updatedTask => {
            if (isErr(updatedTask)) {
              taskById[updatedTask.error.task.id].reject(updatedTask.error);
            } else {
              taskById[updatedTask.value.id].resolve(updatedTask.value);
            }
          });
        })
        .catch(ex => {
          tasks.forEach(({ reject }) => reject(ex));
        });
    });

  return {
    get maxAttempts() {
      return store.maxAttempts;
    },
    async update(task: ConcreteTaskInstance) {
      return new Promise((resolve, reject) => {
        setImmediate(() => flushBuffer.next());
        storeUpdateBuffer.next({ task, resolve, reject });
      });
    },
    async remove(taskId: string) {
      return store.remove(taskId);
    },
  };
}
