/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { deleteTask } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys, casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useDeleteTask = (caseId: string) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const queryClient = useQueryClient();

  return useMutation(
    (taskId: string) => deleteTask(caseId, taskId),
    {
      mutationKey: casesMutationsKeys.deleteTask,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.tasksList(caseId));
        showSuccessToast(i18n.TASK_DELETED);
      },
    }
  );
};

export type UseDeleteTask = ReturnType<typeof useDeleteTask>;
