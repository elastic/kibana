/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { QUERY_KEY_PREFIX } from '../../constants';
import type { TaskListQuery } from '../../lib/api';
import { useTaskManagerUiAppContext } from '../app_context';
import { toRunsWindow, type RunsTimeRange } from '../lib/runs_time_range';

const QUERY_OPTIONS = { refetchOnWindowFocus: false, retry: false } as const;

export const useOverview = (timeRange: RunsTimeRange) => {
  const { api } = useTaskManagerUiAppContext();
  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, 'overview', timeRange],
    queryFn: ({ signal }) => api.getOverview(toRunsWindow(timeRange), signal),
    keepPreviousData: true,
    ...QUERY_OPTIONS,
  });
};

export const useTasks = (query: TaskListQuery, timeRange: RunsTimeRange) => {
  const { api } = useTaskManagerUiAppContext();
  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, 'tasks', query, timeRange],
    queryFn: ({ signal }) => api.getTasks(query, toRunsWindow(timeRange), signal),
    keepPreviousData: true,
    ...QUERY_OPTIONS,
  });
};

export const useTaskDetail = (taskId: string, timeRange: RunsTimeRange) => {
  const { api } = useTaskManagerUiAppContext();
  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, 'task', taskId, timeRange],
    queryFn: ({ signal }) => api.getTask(taskId, toRunsWindow(timeRange), signal),
    ...QUERY_OPTIONS,
  });
};
