/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { ConcreteTaskInstance } from '../task';
import type { ScriptClause, MustCondition, MustNotCondition } from './query_clauses';
export declare function tasksOfType(taskTypes: string[]): estypes.QueryDslQueryContainer;
export declare function tasksClaimedByOwner(
  taskManagerId: string,
  ...taskFilters: estypes.QueryDslQueryContainer[]
): {
  bool: {
    must: estypes.QueryDslQueryContainer[];
  };
};
export declare const IdleTaskWithExpiredRunAt: MustCondition;
export declare const InactiveTasks: MustNotCondition;
export declare const EnabledTask: MustCondition;
export declare const RecognizedTask: MustNotCondition;
export declare const RunningOrClaimingTaskWithExpiredRetryAt: MustCondition;
export declare const SortByRunAtAndRetryAt: estypes.SortCombinations;
export declare function getClaimSort(definitions: TaskTypeDictionary): estypes.SortCombinations[];
export declare function claimSort(
  definitions: TaskTypeDictionary,
  tasks: ConcreteTaskInstance[]
): ConcreteTaskInstance[];
export interface UpdateFieldsAndMarkAsFailedOpts {
  fieldUpdates: {
    [field: string]: string | number | Date;
  };
  claimableTaskTypes: string[];
  skippedTaskTypes: string[];
  taskMaxAttempts: {
    [field: string]: number;
  };
}
export declare const updateFieldsAndMarkAsFailed: ({
  fieldUpdates,
  claimableTaskTypes,
  skippedTaskTypes,
  taskMaxAttempts,
}: UpdateFieldsAndMarkAsFailedOpts) => ScriptClause;
export declare const OneOfTaskTypes: (field: string, types: string[]) => MustCondition;
export declare function tasksWithPartitions(partitions: number[]): estypes.QueryDslQueryContainer;
