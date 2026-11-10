/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Redirect, useHistory, useLocation, useParams } from 'react-router-dom';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu, type AppHeaderTab } from '@kbn/app-header';
import { useQueryClient } from '@kbn/react-query';
import { Route, Routes } from '@kbn/shared-ux-router';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { PLUGIN_NAME, QUERY_KEY_PREFIX } from '../constants';
import type { TaskListQuery } from '../lib/api';
import { useOverview } from './hooks/use_task_manager_queries';
import { getErrorMessage, getErrorStatusCode } from './lib/errors';
import {
  OVERVIEW_PATH,
  getRoutePath,
  getTasksPath,
  parseRoute,
  parseRunsTimeRangeSearch,
  pushPath,
  toRunsTimeRangeSearch,
} from './lib/routes';
import type { RunsTimeRange } from './lib/runs_time_range';
import { FAILED_IN_WINDOW_FILTER } from './lib/task_status';
import { NoAccessPrompt } from './components/no_access_prompt';
import { OverviewCallouts, OverviewStats } from './components/overview_stats';
import { RunsTimeRangePicker } from './components/runs_time_range_picker';
import { TaskTypesTable } from './components/task_types_table';
import { DEFAULT_TASK_LIST_QUERY, TasksTable } from './components/tasks_table';
import { TaskFlyout } from './components/task_flyout';

const DESCRIPTION = i18n.translate('xpack.taskManagerUi.description', {
  defaultMessage:
    'Background tasks run by all Kibana instances: what is scheduled, what is overdue, which task types fail, and why a task is not running.',
});

const TaskManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const history = useHistory();
  const { search } = useLocation();
  const { section } = useParams<{ section: string }>();
  const route = parseRoute(section);
  const routePath = getRoutePath(route);
  const selectedTab = route.tab;
  const runsTimeRange = useMemo(() => parseRunsTimeRangeSearch(search), [search]);
  const [taskListQuery, setTaskListQuery] = useState<TaskListQuery>(DEFAULT_TASK_LIST_QUERY);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();

  // A task type opened from the URL, such as with the back button, lists its tasks with the default filters.
  if (route.tab === 'tasks' && route.taskType !== taskListQuery.taskType) {
    setTaskListQuery({ ...DEFAULT_TASK_LIST_QUERY, taskType: route.taskType });
  }

  const overview = useOverview(runsTimeRange);

  const onRunsTimeRangeChange = useCallback(
    (timeRange: RunsTimeRange) => {
      setTaskListQuery((query) => ({ ...query, page: 1 }));
      pushPath(history, routePath, toRunsTimeRangeSearch(timeRange));
    },
    [history, routePath]
  );

  const routeTaskType = route.tab === 'tasks' ? route.taskType : undefined;
  const onTaskListQueryChange = useCallback(
    (query: TaskListQuery) => {
      setTaskListQuery(query);
      if (selectedTab !== 'tasks' || query.taskType !== routeTaskType) {
        pushPath(history, getTasksPath(query.taskType), search);
      }
    },
    [history, search, selectedTab, routeTaskType]
  );

  const onSelectTaskType = useCallback(
    (taskType: string) => onTaskListQueryChange({ ...DEFAULT_TASK_LIST_QUERY, taskType }),
    [onTaskListQueryChange]
  );

  const onSelectFailedTasks = useCallback(
    (taskType: string) =>
      onTaskListQueryChange({
        ...DEFAULT_TASK_LIST_QUERY,
        taskType,
        status: FAILED_IN_WINDOW_FILTER,
      }),
    [onTaskListQueryChange]
  );

  const getTaskTypeHref = useCallback(
    (taskType: string) => history.createHref({ pathname: getTasksPath(taskType), search }),
    [history, search]
  );

  const tabs = useMemo<AppHeaderTab[]>(
    () => [
      {
        id: 'overview',
        label: i18n.translate('xpack.taskManagerUi.tabs.overview', {
          defaultMessage: 'Overview',
        }),
        isSelected: selectedTab === 'overview',
        onClick: () => {
          if (selectedTab !== 'overview') {
            pushPath(history, OVERVIEW_PATH, search);
          }
        },
        'data-test-subj': 'taskManagerUiOverviewTab',
      },
      {
        id: 'tasks',
        label: i18n.translate('xpack.taskManagerUi.tabs.tasks', { defaultMessage: 'Tasks' }),
        isSelected: selectedTab === 'tasks',
        onClick: () => {
          if (selectedTab !== 'tasks') {
            pushPath(history, getTasksPath(taskListQuery.taskType), search);
          }
        },
        'data-test-subj': 'taskManagerUiTasksTab',
      },
    ],
    [history, search, selectedTab, taskListQuery.taskType]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem: {
        id: 'refresh',
        iconType: 'refresh',
        isLoading: overview.isFetching,
        label: i18n.translate('xpack.taskManagerUi.refresh', { defaultMessage: 'Refresh' }),
        run: () => queryClient.invalidateQueries([QUERY_KEY_PREFIX]),
        testId: 'taskManagerUiRefreshButton',
      },
    }),
    [overview.isFetching, queryClient]
  );

  const taskTypes = useMemo(
    () => (overview.data?.task_types ?? []).map(({ task_type: taskType }) => taskType),
    [overview.data]
  );

  const { taskType: selectedTaskType } = taskListQuery;
  const failedTaskCount = useMemo(
    () =>
      (overview.data?.task_types ?? [])
        .filter(({ task_type: taskType }) => !selectedTaskType || taskType === selectedTaskType)
        .reduce((count, { runs }) => count + (runs?.failed_tasks ?? 0), 0),
    [overview.data, selectedTaskType]
  );

  const statusCounts = useMemo(() => {
    if (!overview.data) {
      return {};
    }
    if (!selectedTaskType) {
      return overview.data.totals.by_status;
    }
    return (
      overview.data.task_types.find(({ task_type: taskType }) => taskType === selectedTaskType)
        ?.by_status ?? {}
    );
  }, [overview.data, selectedTaskType]);

  if (getErrorStatusCode(overview.error) === 403) {
    return (
      <>
        <AppHeader title={PLUGIN_NAME} description={DESCRIPTION} spacing="bleed" />
        <EuiSpacer size="l" />
        <NoAccessPrompt />
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={PLUGIN_NAME}
        description={DESCRIPTION}
        tabs={tabs}
        menu={menu}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {/* Block wrapper so EUI flex groups don't grow inside the management page's flex column */}
      <div>
        {overview.error ? (
          <>
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('xpack.taskManagerUi.overview.loadError', {
                defaultMessage: 'Unable to load Kibana background tasks',
              })}
              text={getErrorMessage(overview.error)}
            />
            <EuiSpacer size="l" />
          </>
        ) : null}
        <RunsTimeRangePicker timeRange={runsTimeRange} onChange={onRunsTimeRangeChange} />
        <EuiSpacer size="m" />
        {selectedTab === 'overview' && (
          <>
            <OverviewCallouts overview={overview.data} />
            <OverviewStats overview={overview.data} isLoading={overview.isLoading} />
            <EuiSpacer size="xl" />
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.taskManagerUi.taskTypes.title', {
                  defaultMessage: 'Task types',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <TaskTypesTable
              taskTypes={overview.data?.task_types ?? []}
              isLoading={overview.isFetching}
              getTaskTypeHref={getTaskTypeHref}
              onSelectTaskType={onSelectTaskType}
              onSelectFailedTasks={onSelectFailedTasks}
            />
          </>
        )}
        {selectedTab === 'tasks' && (
          <TasksTable
            query={taskListQuery}
            timeRange={runsTimeRange}
            taskTypes={taskTypes}
            statusCounts={statusCounts}
            failedTaskCount={failedTaskCount}
            onQueryChange={onTaskListQueryChange}
            onSelectTask={setSelectedTaskId}
          />
        )}
      </div>
      {selectedTaskId && (
        <TaskFlyout
          taskId={selectedTaskId}
          timeRange={runsTimeRange}
          onClose={() => setSelectedTaskId(undefined)}
        />
      )}
    </>
  );
};

export const TaskManagerApp: React.FC = () => (
  <Routes>
    <Route exact path="/:section">
      <TaskManagerPage />
    </Route>
    <Redirect to={OVERVIEW_PATH} />
  </Routes>
);
