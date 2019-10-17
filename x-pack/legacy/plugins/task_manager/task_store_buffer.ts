/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexBy, pluck } from 'lodash';
import { Subject } from 'rxjs';
import { bufferWhen, filter } from 'rxjs/operators';
import { BulkUpdateTaskFailureResult, TaskStore } from './task_store';
import { ConcreteTaskInstance } from './task';
import { either } from './lib/result_type';
import { proxyWithOverrides } from './lib/proxy_with_overrides';
import { Logger } from './types';

export function createTaskStoreUpdateBuffer(store: TaskStore, logger: Logger): TaskStore {
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
          logger.error(
            `Failed to perform a bulk update of the following tasks: ${tasks
              .map(({ task }) => task.id)
              .join()}`
          );
          tasks.forEach(({ onFailure }) => onFailure(ex));
        });
    });

  return proxyWithOverrides(store, {
    async update(task: ConcreteTaskInstance) {
      return new Promise((resolve, reject) => {
        setImmediate(() => flushBuffer.next());
        storeUpdateBuffer.next({ task, onSuccess: resolve, onFailure: reject });
      });
    },
  });
}
