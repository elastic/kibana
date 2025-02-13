/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { Logger } from '@kbn/core/server';
import { TaskRunner } from '../task_running';
import { TaskDefinition } from '../task';

export interface ICapacity {
  get capacity(): number;
  availableCapacity(
    tasksInPool: Map<string, TaskRunner>,
    taskDefinition?: TaskDefinition | null
  ): number;
  usedCapacity(tasksInPool: Map<string, TaskRunner>): number;
  usedCapacityPercentage(tasksInPool: Map<string, TaskRunner>): number;
  getUsedCapacityByType(tasksInPool: TaskRunner[], type: string): number;
  determineTasksToRunBasedOnCapacity(
    tasks: TaskRunner[],
    availableCapacity: number
  ): [TaskRunner[], TaskRunner[]];
}

export interface CapacityOpts {
  capacity$: Observable<number>;
  logger: Logger;
}
