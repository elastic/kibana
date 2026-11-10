/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import type { Logger } from '@kbn/core/server';

import { minimatch } from 'minimatch';
import type { TaskStore } from '../task_store';
import type { TaskClaim, TaskTiming } from '../task_events';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskClaimingBatches } from '../queries/task_claiming';
import type { ConcreteTaskInstance, TaskMemoryEstimate } from '../task';
import { claimAvailableTasksMget } from './strategy_mget';
import { CLAIM_STRATEGY_MGET } from '../config';
import type { TaskPartitioner } from '../lib/task_partitioner';

/**
 * Heap budget for one claim cycle: tasks are admitted while the sum of their
 * estimated heap stays within `budgetBytes`.
 */
export interface ClaimMemoryGate {
  budgetBytes: number;
  /** Runs estimated at or below this are admitted against capacity only. */
  lightTaskBytes: number;
  /**
   * Whether a candidate is light: its whole estimate, buffers outside the heap
   * included, is at or below `lightTaskBytes`. Absent, the budget-priced
   * estimate is compared instead.
   */
  isLight?: (taskId: string, taskType: string, cost: number) => boolean;
  /** Bytes the running tasks have reserved beyond their estimates, already taken off the budget. */
  reservedBytes: number;
  estimateBytes: (taskId: string, taskType: string, cost: number) => number;
  /** Restores an instance estimate from its document; true when the instance was unknown and took it. */
  seed: (taskId: string, taskType: string, cost: number, estimate: TaskMemoryEstimate) => boolean;
}

export interface TaskClaimerOpts {
  getCapacity: (taskType?: string | undefined) => number;
  /** Present with adaptive capacity; absent means no heap accounting during the claim. */
  getMemoryGate?: () => ClaimMemoryGate | undefined;
  claimOwnershipUntil: Date;
  batches: TaskClaimingBatches;
  events$: Subject<TaskClaim>;
  taskStore: TaskStore;
  definitions: TaskTypeDictionary;
  excludedTaskTypes: string[];
  taskMaxAttempts: Record<string, number>;
  logger: Logger;
  taskPartitioner: TaskPartitioner;
}

export interface ClaimOwnershipResult {
  stats: {
    tasksUpdated: number;
    tasksConflicted: number;
    tasksClaimed: number;
    tasksLeftUnclaimed?: number;
    tasksErrors?: number;
    staleTasks?: number;
  };
  docs: ConcreteTaskInstance[];
  timing?: TaskTiming;
}

export type TaskClaimerFn = (opts: TaskClaimerOpts) => Promise<ClaimOwnershipResult>;

const validClaimStrategies = [CLAIM_STRATEGY_MGET];

export function getTaskClaimer(logger: Logger, strategy: string): TaskClaimerFn {
  if (!validClaimStrategies.includes(strategy)) {
    logger.warn(`Unknown task claiming strategy "${strategy}", falling back to default: mget`);
  }
  logger.info(`using task claiming strategy: ${CLAIM_STRATEGY_MGET}`);
  return claimAvailableTasksMget;
}

export function getEmptyClaimOwnershipResult(): ClaimOwnershipResult {
  return {
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
      staleTasks: 0,
    },
    docs: [],
  };
}

export function isTaskTypeExcluded(excludedTaskTypePatterns: string[], taskType: string) {
  for (const excludedTypePattern of excludedTaskTypePatterns) {
    if (minimatch(taskType, excludedTypePattern)) {
      return true;
    }
  }

  return false;
}

export function getExcludedTaskTypes(
  definitions: TaskTypeDictionary,
  excludedTaskTypePatterns: string[]
) {
  return definitions
    .getAllTypes()
    .filter((taskType) => isTaskTypeExcluded(excludedTaskTypePatterns, taskType));
}
