/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CaseTask } from '../../common/types/domain/task/v1';
import type { CaseTasksResponse } from './api';
import { reorderTasks } from './api';
import { casesMutationsKeys, casesQueriesKeys } from './constants';

interface ReorderTasksParams {
  caseId: string;
  orderedTaskIds: string[];
  parentTaskId: string | null;
}

export const useReorderTasks = () => {
  const queryClient = useQueryClient();

  return useMutation(
    casesMutationsKeys.reorderTasks,
    ({ caseId, orderedTaskIds, parentTaskId }: ReorderTasksParams) =>
      reorderTasks(caseId, orderedTaskIds, parentTaskId),
    {
      onMutate: async ({ caseId, orderedTaskIds, parentTaskId }) => {
        const queryKey = casesQueriesKeys.tasksList(caseId);
        await queryClient.cancelQueries(queryKey);

        const previousData = queryClient.getQueryData<CaseTasksResponse>(queryKey);

        if (previousData) {
          const taskById = new Map(previousData.tasks.map((t) => [t.id, t]));
          const affectedSet = new Set(orderedTaskIds);

          // Reorder tasks in the affected group while preserving positions of others.
          const affectedInOrder = orderedTaskIds
            .map((id) => taskById.get(id))
            .filter((t): t is CaseTask => t !== undefined);

          let affectedIdx = 0;
          const newTasks = previousData.tasks.map((t) => {
            const pid = t.parent_task_id ?? null;
            if (pid === parentTaskId && affectedSet.has(t.id)) {
              return affectedInOrder[affectedIdx++] ?? t;
            }
            return t;
          });

          queryClient.setQueryData<CaseTasksResponse>(queryKey, { ...previousData, tasks: newTasks });
        }

        return { previousData, queryKey };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
      onSettled: (_data, _err, { caseId }) => {
        queryClient.invalidateQueries(casesQueriesKeys.tasksList(caseId));
      },
    }
  );
};
