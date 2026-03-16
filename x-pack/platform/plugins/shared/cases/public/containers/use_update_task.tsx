/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { UpdateTaskRequest, CaseTasksResponse } from './api';
import { updateTask } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys, casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useUpdateTask = (caseId: string) => {
  const { showErrorToast } = useCasesToast();
  const queryClient = useQueryClient();

  return useMutation(
    ({ taskId, request }: { taskId: string; request: UpdateTaskRequest }) =>
      updateTask(caseId, taskId, request),
    {
      mutationKey: casesMutationsKeys.updateTask,
      onMutate: async ({ taskId, request }) => {
        const queryKey = casesQueriesKeys.tasksList(caseId);
        await queryClient.cancelQueries(queryKey);

        const previousData = queryClient.getQueryData<CaseTasksResponse>(queryKey);

        if (previousData) {
          const newTasks = previousData.tasks.map((t) =>
            t.id === taskId ? { ...t, ...request } : t
          );
          queryClient.setQueryData<CaseTasksResponse>(queryKey, { ...previousData, tasks: newTasks });
        }

        return { previousData, queryKey };
      },
      onError: (error: ServerError, _vars, context) => {
        if (context?.previousData) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSettled: () => {
        queryClient.invalidateQueries(casesQueriesKeys.tasksList(caseId));
      },
    }
  );
};

export type UseUpdateTask = ReturnType<typeof useUpdateTask>;
