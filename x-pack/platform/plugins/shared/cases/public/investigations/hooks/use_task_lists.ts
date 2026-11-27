/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { SaveTaskListRequest } from '../../../common/investigations/types';
import {
  applyRecordTaskList,
  createTaskList,
  deleteTaskList,
  getTaskLists,
  getTemplateTaskLists,
  saveTemplateTaskLists,
  updateTaskList,
} from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';

const THIRTY_SECONDS_MS = 30 * 1000;

/** The reusable task lists of the space (`GET _task_lists`). */
export const useTaskLists = () => {
  const { http } = useInvestigationsServices();

  return useQuery(investigationKeys.taskLists(), () => getTaskLists(http), {
    staleTime: THIRTY_SECONDS_MS,
    retry: false,
  });
};

/** Lists, template links and the templates' `task_list_ids` all change together. */
const useRefreshTaskListData = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries(investigationKeys.taskLists()),
      queryClient.invalidateQueries(investigationKeys.types()),
      queryClient.invalidateQueries([...investigationKeys.all, 'template_task_lists']),
    ]);
};

/**
 * Creates a task list, or updates it when `taskListId` is given. The caller handles errors (a 403
 * means read-only, a 409 means someone else changed the list).
 */
export const useSaveTaskList = () => {
  const { http } = useInvestigationsServices();
  const refresh = useRefreshTaskListData();

  return useMutation(
    ({ taskListId, body }: { taskListId?: string; body: SaveTaskListRequest }) =>
      taskListId ? updateTaskList(http, taskListId, body) : createTaskList(http, body),
    { onSuccess: () => refresh() }
  );
};

/** Deletes a task list; it also leaves every template that referenced it. */
export const useDeleteTaskList = () => {
  const { http } = useInvestigationsServices();
  const refresh = useRefreshTaskListData();

  return useMutation((taskListId: string) => deleteTaskList(http, taskListId), {
    onSuccess: () => refresh(),
  });
};

/** The ordered task list ids linked to one template (`GET _template_task_lists/{id}`). */
export const useTemplateTaskLists = (templateId: string) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    investigationKeys.templateTaskLists(templateId),
    () => getTemplateTaskLists(http, templateId),
    { staleTime: 0, retry: false }
  );
};

/** Replaces the task lists linked to a template. The caller handles errors. */
export const useSaveTemplateTaskLists = () => {
  const { http } = useInvestigationsServices();
  const refresh = useRefreshTaskListData();

  return useMutation(
    ({ templateId, taskListIds }: { templateId: string; taskListIds: string[] }) =>
      saveTemplateTaskLists(http, templateId, { task_list_ids: taskListIds }),
    { onSuccess: () => refresh() }
  );
};

/** Adds one task list to a record. The caller shows the server's message (409 when already applied). */
export const useApplyRecordTaskList = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();

  return useMutation((taskListId: string) => applyRecordTaskList(http, recordId, taskListId), {
    onSuccess: () => {
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
      void queryClient.invalidateQueries(investigationKeys.findAll());
    },
  });
};
