/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '../../task';
import { TaskCost } from '../../task';
import type { TaskClaimingBatches } from '../../queries/task_claiming';
import { isLimited } from '../../queries/task_claiming';
import { sharedConcurrencyTaskTypes, type TaskTypeDictionary } from '../../task_type_dictionary';

/**
 * Effective cost for a task: instance override, then task type definition, then Normal.
 */
export function getTaskCost(task: ConcreteTaskInstance, definitions: TaskTypeDictionary): number {
  return task.cost ?? definitions.get(task.taskType)?.cost ?? TaskCost.Normal;
}

interface SelectTasksByCapacityOpts {
  definitions: TaskTypeDictionary;
  tasks: ConcreteTaskInstance[];
  batches: TaskClaimingBatches;
}

// given a list of tasks and capacity info, select the tasks that meet capacity.
// For limited task types, maxConcurrency is treated as a cost budget: each task
// consumes its (instance or definition) cost from the budget.
export function selectTasksByCapacity({
  definitions,
  tasks,
  batches,
}: SelectTasksByCapacityOpts): ConcreteTaskInstance[] {
  const limitedBatches = batches.filter(isLimited);
  // remaining cost budget per task type. For shared concurrency types, all share the same budget.
  const remainingBudgetByType = new Map<string, number>();

  for (const limitedBatch of limitedBatches) {
    const { tasksTypes: taskType } = limitedBatch;
    const taskDef = definitions.get(taskType);
    const defCost = taskDef?.cost ?? TaskCost.Normal;
    const maxConcurrency = taskDef?.maxConcurrency ?? 0;
    const budget = maxConcurrency * defCost;
    remainingBudgetByType.set(taskType, budget);
    const sharesConcurrencyWith = sharedConcurrencyTaskTypes(taskType);
    if (sharesConcurrencyWith) {
      const minBudget = Math.min(
        budget,
        ...sharesConcurrencyWith.map((t) => {
          const d = definitions.get(t);
          return (d?.maxConcurrency ?? 0) * (d?.cost ?? TaskCost.Normal);
        })
      );
      for (const t of sharesConcurrencyWith) {
        remainingBudgetByType.set(t, minBudget);
      }
    }
  }

  const result: ConcreteTaskInstance[] = [];
  for (const task of tasks) {
    const remaining = remainingBudgetByType.get(task.taskType);
    if (remaining == null) {
      result.push(task);
      continue;
    }

    const taskCost = getTaskCost(task, definitions);
    if (remaining >= taskCost) {
      result.push(task);
      const newRemaining = remaining - taskCost;
      const sharesConcurrencyWith = sharedConcurrencyTaskTypes(task.taskType);
      if (sharesConcurrencyWith) {
        for (const taskType of sharesConcurrencyWith) {
          remainingBudgetByType.set(taskType, newRemaining);
        }
      } else {
        remainingBudgetByType.set(task.taskType, newRemaining);
      }
    }
  }

  return result;
}
