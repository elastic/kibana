/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '../../task';
import { getTaskCostFromInstance, TaskCost } from '../../task';
import type { TaskTypeDictionary } from '../../task_type_dictionary';

//  Effective cost for this task (instance override, then definition, then Normal).
export function getTaskCost(
  task: Pick<ConcreteTaskInstance, 'taskType' | 'cost'>,
  definitions: TaskTypeDictionary
): number {
  const instanceCost = getTaskCostFromInstance(task.cost);
  return instanceCost ?? definitions.get(task.taskType)?.cost ?? TaskCost.Normal;
}
