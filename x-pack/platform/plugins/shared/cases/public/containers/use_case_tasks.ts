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
  addTaskComment,
  applyTaskTemplate,
  createTask,
  createTaskTemplate,
  deleteTask,
  deleteTaskComment,
  deleteTaskTemplate,
  getCaseTasks,
  getTaskComments,
  getTaskTemplates,
  updateTask,
  updateTaskTemplate,
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

const useTaskTemplateMutation = <TVariables>(
  mutationKey: readonly string[],
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successTitle: string
) => {
  const { owner } = useCasesContext();
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const queryClient = useQueryClient();

  return useMutation(mutationFn, {
    mutationKey,
    onSuccess: () => {
      showSuccessToast(successTitle);
      queryClient.invalidateQueries(casesQueriesKeys.taskTemplates(owner));
    },
    onError: (error: ServerError) => showErrorToast(error, { title: i18n.ERROR_TITLE }),
  });
};

export const useCreateTaskTemplate = () =>
  useTaskTemplateMutation(
    casesMutationsKeys.createTaskTemplate,
    createTaskTemplate,
    i18n.TASK_LIST_SAVED
  );

export const useUpdateTaskTemplate = () =>
  useTaskTemplateMutation(
    casesMutationsKeys.updateTaskTemplate,
    ({
      templateId,
      request,
    }: {
      templateId: string;
      request: taskApiV1.TaskTemplatePatchRequest;
    }) => updateTaskTemplate(templateId, request),
    i18n.TASK_LIST_SAVED
  );

export const useDeleteTaskTemplate = () =>
  useTaskTemplateMutation(
    casesMutationsKeys.deleteTaskTemplate,
    deleteTaskTemplate,
    i18n.TASK_LIST_DELETED
  );

export const useGetTaskComments = (caseId: string, taskId: string) => {
  const { showErrorToast } = useCasesToast();
  return useQuery(
    casesQueriesKeys.taskComments(caseId, taskId),
    ({ signal }) => getTaskComments(caseId, taskId, signal),
    { onError: (error: ServerError) => showErrorToast(error, { title: i18n.ERROR_TITLE }) }
  );
};

const useTaskCommentMutation = <TVariables>(
  caseId: string,
  taskId: string,
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
      queryClient.invalidateQueries(casesQueriesKeys.taskComments(caseId, taskId));
      // The task list carries the comment counts.
      queryClient.invalidateQueries({ queryKey: casesQueriesKeys.caseTasks(caseId), exact: true });
    },
    onError: (error: ServerError) => showErrorToast(error, { title: i18n.ERROR_TITLE }),
  });
};

export const useAddTaskComment = (caseId: string, taskId: string) =>
  useTaskCommentMutation(
    caseId,
    taskId,
    casesMutationsKeys.addTaskComment,
    (comment: string) => addTaskComment(caseId, taskId, { comment }),
    i18n.TASK_COMMENT_ADDED
  );

export const useDeleteTaskComment = (caseId: string, taskId: string) =>
  useTaskCommentMutation(
    caseId,
    taskId,
    casesMutationsKeys.deleteTaskComment,
    (commentId: string) => deleteTaskComment(caseId, taskId, commentId),
    i18n.TASK_COMMENT_DELETED
  );
