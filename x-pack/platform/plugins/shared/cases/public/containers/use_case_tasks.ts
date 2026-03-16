/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { taskApiV1 } from '../../common/types/api';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import type { ServerError } from '../types';
import {
  applyTaskTemplate,
  createTask,
  deleteTask,
  getCaseTasks,
  getTaskTemplates,
  updateTask,
} from './api';
import { casesMutationsKeys, casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useGetCaseTasks = (caseId: string, { enabled = true } = {}) => {
  const { showErrorToast } = useCasesToast();
  return useQuery(
    casesQueriesKeys.caseTasks(caseId),
    ({ signal }) => getCaseTasks(caseId, signal),
    {
      enabled,
      onError: (error: ServerError) => showErrorToast(error, { title: i18n.ERROR_TITLE }),
    }
  );
};

export const useGetTaskTemplates = ({ enabled = true } = {}) => {
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();
  return useQuery(
    casesQueriesKeys.taskTemplates(owner),
    ({ signal }) => getTaskTemplates(owner, signal),
    {
      enabled,
      onError: (error: ServerError) => showErrorToast(error, { title: i18n.ERROR_TITLE }),
    }
  );
};

const useTaskMutation = <TVariables>(
  caseId: string,
  mutationKey: readonly string[],
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successTitle: string
) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const queryClient = useQueryClient();

  return useMutation(mutationFn, {
    mutationKey,
    onSuccess: () => {
      showSuccessToast(successTitle);
      queryClient.invalidateQueries(casesQueriesKeys.caseTasks(caseId));
      queryClient.invalidateQueries(casesQueriesKeys.caseView());
    },
    onError: (error: ServerError) => showErrorToast(error, { title: i18n.ERROR_TITLE }),
  });
};

export const useCreateTask = (caseId: string) =>
  useTaskMutation(
    caseId,
    casesMutationsKeys.createTask,
    (request: taskApiV1.TaskCreateRequest) => createTask(caseId, request),
    i18n.TASK_ADDED
  );

export const useUpdateTask = (caseId: string) =>
  useTaskMutation(
    caseId,
    casesMutationsKeys.updateTask,
    ({ taskId, request }: { taskId: string; request: taskApiV1.TaskPatchRequest }) =>
      updateTask(caseId, taskId, request),
    i18n.TASK_UPDATED
  );

export const useDeleteTask = (caseId: string) =>
  useTaskMutation(
    caseId,
    casesMutationsKeys.deleteTask,
    (taskId: string) => deleteTask(caseId, taskId),
    i18n.TASK_DELETED
  );

export const useApplyTaskTemplate = (caseId: string) =>
  useTaskMutation(
    caseId,
    casesMutationsKeys.applyTaskTemplate,
    (templateId: string) => applyTaskTemplate(caseId, templateId),
    i18n.TASK_LIST_APPLIED
  );
