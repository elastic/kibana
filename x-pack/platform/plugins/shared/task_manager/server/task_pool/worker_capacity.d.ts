/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskRunner } from '../task_running';
import type { CapacityOpts, ICapacity } from './types';
import type { TaskDefinition } from '../task';
export declare class WorkerCapacity implements ICapacity {
  private workers;
  private logger;
  constructor(opts: CapacityOpts);
  get capacity(): number;
  /**
   * Gets how many workers are currently in use.
   */
  usedCapacity(tasksInPool: Map<string, TaskRunner>): number;
  /**
   * Gets % of workers in use
   */
  usedCapacityPercentage(tasksInPool: Map<string, TaskRunner>): number;
  /**
   * Gets how many workers are currently in use by each type.
   */
  getUsedCapacityByType(tasksInPool: TaskRunner[], type: string): number;
  availableCapacity(
    tasksInPool: Map<string, TaskRunner>,
    taskDefinition?: TaskDefinition | null
  ): number;
  determineTasksToRunBasedOnCapacity(
    tasks: TaskRunner[],
    availableCapacity: number
  ): [TaskRunner[], TaskRunner[]];
}
