/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexBy, pluck } from 'lodash';
import { Subject } from 'rxjs';
import { bufferWhen, filter } from 'rxjs/operators';
import { Updatable } from './task_runner';
import { BulkUpdateTaskFailureResult } from './task_store';
import { ConcreteTaskInstance } from './task';
import { Result, either } from './lib/result_type';

export interface BatchUpdatable extends Updatable {
  bulkUpdate(
    docs: ConcreteTaskInstance[]
  ): Promise<Array<Result<ConcreteTaskInstance, BulkUpdateTaskFailureResult>>>;
}

export function createTaskStoreUpdateBuffer(store: BatchUpdatable): Updatable {
  const flushBuffer = new Subject<any>();
  const storeUpdateBuffer = new Subject<{
    task: ConcreteTaskInstance;
    onSuccess: (task: ConcreteTaskInstance) => void;
    onFailure: (error: BulkUpdateTaskFailureResult) => void;
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
            either(
              updatedTask,
              task => {
                taskById[task.id].onSuccess(task);
              },
              ({ task, error }) => {
                taskById[task.id].onFailure({ task, error });
              }
            );
          });
        })
        .catch(ex => {
          tasks.forEach(({ onFailure }) => onFailure(ex));
        });
    });

  return {
    get maxAttempts() {
      return store.maxAttempts;
    },
    async update(task: ConcreteTaskInstance) {
      return new Promise((resolve, reject) => {
        setImmediate(() => flushBuffer.next());
        storeUpdateBuffer.next({ task, onSuccess: resolve, onFailure: reject });
      });
    },
    async remove(taskId: string) {
      return store.remove(taskId);
    },
  };
}
