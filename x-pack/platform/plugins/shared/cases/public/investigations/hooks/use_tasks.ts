/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as kbnI18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { TaskItem } from '../../../common/investigations/types';
import { TASK_SORT_ORDER_GAP } from '../../../common/investigations/constants';
import { getWorkflows, reorderTasks, runTaskWorkflow } from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { useInvestigationToasts } from './use_investigation_toasts';

const REORDER_TASKS_ERROR = kbnI18n.translate(
  'xpack.cases.investigations.hooks.reorderTasksError',
  { defaultMessage: 'Could not reorder the tasks' }
);
const RUN_TASK_WORKFLOW_ERROR = kbnI18n.translate(
  'xpack.cases.investigations.hooks.runTaskWorkflowError',
  { defaultMessage: 'Could not run the workflow' }
);

interface CachedTasks {
  items: TaskItem[];
  total: number;
  truncated: boolean;
}

const isCachedTasks = (value: unknown): value is CachedTasks =>
  typeof value === 'object' && value !== null && Array.isArray((value as CachedTasks).items);

/**
 * Reorders sibling tasks. The cached task lists are reordered at once so the row stays where it
 * was dropped, and restored when the server refuses.
 */
export const useReorderTasks = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError } = useInvestigationToasts();
  const tasksKey = [...investigationKeys.itemsAll(recordId), 'all', 'task'];

  return useMutation((taskIds: string[]) => reorderTasks(http, recordId, { task_ids: taskIds }), {
    onMutate: async (taskIds) => {
      await queryClient.cancelQueries(tasksKey);
      const previous = queryClient.getQueriesData<CachedTasks>(tasksKey);
      queryClient.setQueriesData<CachedTasks>(tasksKey, (cached) => {
        if (!isCachedTasks(cached)) {
          return cached;
        }
        return {
          ...cached,
          items: cached.items.map((task) => {
            const index = taskIds.indexOf(task.id);
            return index < 0
              ? task
              : { ...task, task: { ...task.task, sort_order: (index + 1) * TASK_SORT_ORDER_GAP } };
          }),
        };
      });
      return { previous };
    },
    onError: (error, _taskIds, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      showError(error, REORDER_TASKS_ERROR);
    },
    onSettled: () => {
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    },
  });
};

/** Starts the workflow of an automation task. */
export const useRunTaskWorkflow = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError } = useInvestigationToasts();

  return useMutation((taskId: string) => runTaskWorkflow(http, recordId, taskId), {
    onSuccess: () => {
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    },
    onError: (error) => {
      showError(error, RUN_TASK_WORKFLOW_ERROR);
      void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    },
  });
};

const THIRTY_SECONDS_MS = 30 * 1000;

/** The enabled workflows of the space; the query fails when Workflows is not available. */
export const useWorkflowList = (enabled = true) => {
  const { http } = useInvestigationsServices();

  return useQuery([...investigationKeys.all, 'workflows'], () => getWorkflows(http), {
    enabled,
    staleTime: THIRTY_SECONDS_MS,
    retry: false,
  });
};
