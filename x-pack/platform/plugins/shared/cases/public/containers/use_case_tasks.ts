/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useWorkflowsApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import type { CaseTask } from '../../common/types/domain/task/v1';
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
  refreshTaskWorkflow,
  runTaskWorkflow,
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

export const useRunTaskWorkflow = (caseId: string) =>
  useTaskMutation(
    caseId,
    casesMutationsKeys.runTaskWorkflow,
    (taskId: string) => runTaskWorkflow(caseId, taskId),
    i18n.TASK_WORKFLOW_STARTED
  );

const WORKFLOW_RUN_POLL_MS = 3000;

/**
 * While a task's workflow is running, reads its outcome every few seconds; the server completes
 * the task when the run succeeds, so the tasks list is reloaded once any run settles.
 */
export const usePollTaskWorkflowRuns = (caseId: string, tasks: CaseTask[] | undefined) => {
  const queryClient = useQueryClient();
  const { permissions } = useCasesContext();
  const { canReadWorkflow } = useWorkflowsCapabilities();
  // Reading a run's outcome needs Cases update and the workflows read privilege; anyone else
  // would poll a 403 forever and just sees the outcome when the tasks list reloads.
  const canPoll = permissions.update && canReadWorkflow;
  const runningIds = (canPoll ? tasks ?? [] : [])
    .filter((task) => task.workflow_run?.status === 'running')
    .map(({ id }) => id)
    .join(',');

  useEffect(() => {
    if (!runningIds) {
      return;
    }
    const interval = setInterval(async () => {
      const results = await Promise.allSettled(
        runningIds.split(',').map((taskId) => refreshTaskWorkflow(caseId, taskId))
      );
      const settled = results.some(
        (result) => result.status === 'fulfilled' && result.value.workflow_run?.status !== 'running'
      );
      if (settled) {
        queryClient.invalidateQueries(casesQueriesKeys.caseTasks(caseId));
        queryClient.invalidateQueries(casesQueriesKeys.caseView());
      }
    }, WORKFLOW_RUN_POLL_MS);
    return () => clearInterval(interval);
  }, [caseId, queryClient, runningIds]);
};

/** Enabled workflows a task can name, for the task flyout's Workflow field. */
export const useGetTaskWorkflowOptions = ({ enabled }: { enabled: boolean }) => {
  const api = useWorkflowsApi();
  return useQuery({
    queryKey: [...casesQueriesKeys.all, 'task-workflow-options'],
    queryFn: () => api.getWorkflows({ size: 100, enabled: [true] }),
    enabled,
    select: (list) => list.results.map(({ id, name }) => ({ id, name })),
  });
};

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
