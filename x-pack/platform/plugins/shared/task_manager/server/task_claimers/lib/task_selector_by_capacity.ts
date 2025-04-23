/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '../../task';
import type { TaskClaimingBatches } from '../../queries/task_claiming';
import { isLimited } from '../../queries/task_claiming';
import { sharedConcurrencyTaskTypes, type TaskTypeDictionary } from '../../task_type_dictionary';

interface SelectTasksByCapacityOpts {
  definitions: TaskTypeDictionary;
  tasks: ConcreteTaskInstance[];
  batches: TaskClaimingBatches;
}
// given a list of tasks and capacity info, select the tasks that meet capacity
export function selectTasksByCapacity({
  definitions,
  tasks,
  batches,
}: SelectTasksByCapacityOpts): ConcreteTaskInstance[] {
  // create a map of task type - concurrency
  const limitedBatches = batches.filter(isLimited);
  const limitedMap = new Map<string, number | null>();
  for (const limitedBatch of limitedBatches) {
    const { tasksTypes: taskType } = limitedBatch;

    // get concurrency from task definition
    const taskDef = definitions.get(taskType);
    limitedMap.set(taskType, taskDef?.maxConcurrency ?? null);
  }

  // apply the limited concurrency
  const result: ConcreteTaskInstance[] = [];
  for (const task of tasks) {
    // get concurrency of this task type
    const concurrency = limitedMap.get(task.taskType);
    if (concurrency == null) {
      result.push(task);
      continue;
    }

    if (concurrency > 0) {
      result.push(task);

      // get any shared concurrency task types
      const sharesConcurrencyWith = sharedConcurrencyTaskTypes(task.taskType);
      if (sharesConcurrencyWith) {
        for (const taskType of sharesConcurrencyWith) {
          if (limitedMap.has(taskType)) {
            limitedMap.set(taskType, concurrency - 1);
          }
        }
      } else {
        limitedMap.set(task.taskType, concurrency - 1);
      }
    }
  }

  return result;
}
