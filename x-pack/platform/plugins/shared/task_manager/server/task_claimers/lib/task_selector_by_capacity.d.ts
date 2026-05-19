/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '../../task';
import type { TaskClaimingBatches } from '../../queries/task_claiming';
import { type TaskTypeDictionary } from '../../task_type_dictionary';
interface SelectTasksByCapacityOpts {
  definitions: TaskTypeDictionary;
  tasks: ConcreteTaskInstance[];
  batches: TaskClaimingBatches;
}
export declare function selectTasksByCapacity({
  definitions,
  tasks,
  batches,
}: SelectTasksByCapacityOpts): ConcreteTaskInstance[];
export {};
