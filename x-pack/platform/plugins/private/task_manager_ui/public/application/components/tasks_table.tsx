/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  RemovedTaskListItem,
  StoredTaskListItem,
  TaskLastRun,
  TaskSummary,
} from '@kbn/task-manager-plugin/common';
import type { TaskListQuery, TaskListSortField } from '../../lib/api';
import { useTasks } from '../hooks/use_task_manager_queries';
import { EMPTY_VALUE, formatDateTime, formatRelativeTime, formatSchedule } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import type { RunsTimeRange } from '../lib/runs_time_range';
import { FAILED_IN_WINDOW_FILTER, TASK_STATUSES, getStatusLabel } from '../lib/task_status';
import { TaskStatusBadge } from './task_status_badge';

/** Removed tasks only have an ID, a type and a last run, so their other columns are empty. */
type TaskRow =
  | StoredTaskListItem
  | (RemovedTaskListItem & {
      [Key in Exclude<keyof StoredTaskListItem, keyof RemovedTaskListItem>]?: undefined;
    });

const MAX_RESULT_WINDOW = 10_000;

export const DEFAULT_TASK_LIST_QUERY: TaskListQuery = {
  overdue: false,
  page: 1,
  perPage: 20,
  sortField: 'run_at',
  sortOrder: 'asc',
};

const SORTABLE_FIELDS: ReadonlySet<string> = new Set<TaskListSortField>([
  'run_at',
  'scheduled_at',
  'retry_at',
  'attempts',
  'task_type',
  'status',
]);

const isSortField = (field: string): field is TaskListSortField => SORTABLE_FIELDS.has(field);

const ALL_STATUSES_OPTION = {
  value: '',
  text: i18n.translate('xpack.taskManagerUi.tasks.allStatuses', {
    defaultMessage: 'All statuses',
  }),
};

const FAILED_IN_WINDOW_LABEL = i18n.translate('xpack.taskManagerUi.tasks.failedInWindow', {
  defaultMessage: 'Failed in time range',
});

const toStatusOption = (value: string, label: string, count: number) => ({
  value,
  text: i18n.translate('xpack.taskManagerUi.tasks.statusOption', {
    defaultMessage: '{status} ({count})',
    values: { status: label, count: count.toLocaleString() },
  }),
});

const getStatusOptions = (
  statusCounts: Record<string, number>,
  selectedStatus: string | undefined,
  failedTaskCount: number
) => [
  ALL_STATUSES_OPTION,
  ...TASK_STATUSES.filter(
    (status) => (statusCounts[status] ?? 0) > 0 || status === selectedStatus
  ).map((status) => toStatusOption(status, getStatusLabel(status), statusCounts[status] ?? 0)),
  ...(failedTaskCount > 0 || selectedStatus === FAILED_IN_WINDOW_FILTER
    ? [toStatusOption(FAILED_IN_WINDOW_FILTER, FAILED_IN_WINDOW_LABEL, failedTaskCount)]
    : []),
];

export const DateCell: React.FC<{ value?: string | null }> = ({ value }) =>
  value ? (
    <EuiToolTip content={formatDateTime(value)}>
      <span tabIndex={0}>{formatRelativeTime(value)}</span>
    </EuiToolTip>
  ) : (
    <>{EMPTY_VALUE}</>
  );

const RemovedTaskBadge: React.FC = () => (
  <EuiToolTip
    content={i18n.translate('xpack.taskManagerUi.tasks.removedTooltip', {
      defaultMessage:
        'This task no longer exists. It is listed because it failed in the selected time range. Open it to see its run history.',
    })}
  >
    <span tabIndex={0}>
      <EuiBadge color="hollow" data-test-subj="taskManagerUiRemovedTaskBadge">
        {i18n.translate('xpack.taskManagerUi.tasks.removed', { defaultMessage: 'Removed' })}
      </EuiBadge>
    </span>
  </EuiToolTip>
);

const EarlierFailureText: React.FC<{ failure: TaskLastRun }> = ({
  failure: { at, error_message: errorMessage },
}) => {
  const time = formatRelativeTime(at);
  return (
    <EuiToolTip title={formatDateTime(at)} content={errorMessage} display="block">
      <EuiText
        size="xs"
        color="danger"
        className="eui-textTruncate"
        tabIndex={0}
        data-test-subj="taskManagerUiEarlierFailure"
      >
        {errorMessage
          ? i18n.translate('xpack.taskManagerUi.tasks.earlierFailureWithError', {
              defaultMessage: 'Failed {time}: {error}',
              values: { time, error: errorMessage },
            })
          : i18n.translate('xpack.taskManagerUi.tasks.earlierFailure', {
              defaultMessage: 'Failed {time}',
              values: { time },
            })}
      </EuiText>
    </EuiToolTip>
  );
};

const LastRunCell: React.FC<{ lastRun?: TaskLastRun; lastFailure?: TaskLastRun }> = ({
  lastRun,
  lastFailure,
}) => {
  if (!lastRun) {
    return <>{EMPTY_VALUE}</>;
  }
  const { at, outcome, error_message: errorMessage } = lastRun;
  const earlierFailure = lastFailure && lastFailure.at !== at ? lastFailure : undefined;
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {outcome && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={outcome === 'success' ? 'success' : 'danger'}>{outcome}</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <DateCell value={at} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {errorMessage && (
        <EuiFlexItem>
          <EuiToolTip content={errorMessage} display="block">
            <EuiText
              size="xs"
              color="danger"
              className="eui-textTruncate"
              tabIndex={0}
              data-test-subj="taskManagerUiLastRunError"
            >
              {errorMessage}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {earlierFailure && (
        <EuiFlexItem>
          <EarlierFailureText failure={earlierFailure} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const NoTasksMessage: React.FC<{
  taskId?: string;
  onSelectTask: (taskId: string) => void;
}> = ({ taskId, onSelectTask }) => (
  <>
    {i18n.translate('xpack.taskManagerUi.tasks.noItems', {
      defaultMessage:
        'No tasks match these filters. One-time tasks are removed after they run, but their run history is kept.',
    })}
    {taskId && (
      <>
        {' '}
        <EuiLink onClick={() => onSelectTask(taskId)} data-test-subj="taskManagerUiTaskHistoryLink">
          {i18n.translate('xpack.taskManagerUi.tasks.viewTaskHistory', {
            defaultMessage: 'View the run history of this task',
          })}
        </EuiLink>
      </>
    )}
  </>
);

export const TasksTable: React.FC<{
  query: TaskListQuery;
  timeRange: RunsTimeRange;
  taskTypes: string[];
  /** Task counts by status for the selected task type, or for all tasks. */
  statusCounts: Record<string, number>;
  /** How many tasks of the selected task type, or of any type, failed in the time range. */
  failedTaskCount: number;
  onQueryChange: (query: TaskListQuery) => void;
  onSelectTask: (taskId: string) => void;
}> = ({
  query,
  timeRange,
  taskTypes,
  statusCounts,
  failedTaskCount,
  onQueryChange,
  onSelectTask,
}) => {
  const { data, isFetching, error } = useTasks(query, timeRange);
  const listsFailedTasks = query.status === FAILED_IN_WINDOW_FILTER;

  const updateFilters = useCallback(
    (filters: Partial<TaskListQuery>) => onQueryChange({ ...query, ...filters, page: 1 }),
    [onQueryChange, query]
  );

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<TaskRow>) => {
      onQueryChange({
        ...query,
        page: page.index + 1,
        perPage: page.size,
        ...(sort && isSortField(sort.field)
          ? { sortField: sort.field, sortOrder: sort.direction }
          : {}),
      });
    },
    [onQueryChange, query]
  );

  const taskTypeOptions = useMemo(
    () => taskTypes.map((taskType) => ({ label: taskType })),
    [taskTypes]
  );

  const statusOptions = useMemo(
    () => getStatusOptions(statusCounts, query.status, failedTaskCount),
    [statusCounts, query.status, failedTaskCount]
  );

  const columns: Array<EuiBasicTableColumn<TaskRow>> = useMemo(
    () => [
      {
        field: 'id',
        name: i18n.translate('xpack.taskManagerUi.tasks.id', { defaultMessage: 'Task ID' }),
        width: '22em',
        render: (id: string) => (
          <EuiLink onClick={() => onSelectTask(id)} data-test-subj="taskManagerUiTaskLink">
            {id}
          </EuiLink>
        ),
      },
      {
        field: 'task_type',
        name: i18n.translate('xpack.taskManagerUi.tasks.taskType', {
          defaultMessage: 'Task type',
        }),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'status',
        name: i18n.translate('xpack.taskManagerUi.tasks.status', { defaultMessage: 'Status' }),
        sortable: true,
        render: (_status: string | undefined, task: TaskRow) => (
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              {task.removed ? <RemovedTaskBadge /> : <TaskStatusBadge status={task.status} />}
            </EuiFlexItem>
            {task.enabled === false && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.taskManagerUi.tasks.disabled', {
                    defaultMessage: 'Disabled',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'run_at',
        name: i18n.translate('xpack.taskManagerUi.tasks.runAt', { defaultMessage: 'Run at' }),
        sortable: true,
        render: (runAt?: string) => <DateCell value={runAt} />,
      },
      {
        field: 'schedule',
        name: i18n.translate('xpack.taskManagerUi.tasks.schedule', {
          defaultMessage: 'Schedule',
        }),
        render: (schedule: TaskSummary['schedule'], task: TaskRow) =>
          task.removed ? EMPTY_VALUE : formatSchedule(schedule),
      },
      {
        field: 'attempts',
        name: i18n.translate('xpack.taskManagerUi.tasks.attempts', {
          defaultMessage: 'Attempts',
        }),
        sortable: true,
        dataType: 'number',
        render: (attempts?: number) => attempts ?? EMPTY_VALUE,
      },
      {
        field: 'owner_id',
        name: i18n.translate('xpack.taskManagerUi.tasks.owner', { defaultMessage: 'Owner' }),
        truncateText: true,
        render: (ownerId?: string | null) => ownerId ?? EMPTY_VALUE,
      },
      {
        field: 'last_run',
        name: i18n.translate('xpack.taskManagerUi.tasks.lastRun', { defaultMessage: 'Last run' }),
        nameTooltip: {
          content: i18n.translate('xpack.taskManagerUi.tasks.lastRunTooltip', {
            defaultMessage:
              'The most recent run recorded in the event log, with its error if it failed. If the task failed earlier in the selected time range, its latest failure is shown below. Open the task for its full run history.',
          }),
        },
        width: '18em',
        render: (lastRun: TaskLastRun | undefined, task: TaskRow) => (
          <LastRunCell lastRun={lastRun} lastFailure={task.last_failure} />
        ),
      },
    ],
    [onSelectTask]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
        <EuiFlexItem grow={2}>
          <EuiFieldSearch
            key={query.taskId ?? ''}
            fullWidth
            defaultValue={query.taskId}
            placeholder={i18n.translate('xpack.taskManagerUi.tasks.idSearchPlaceholder', {
              defaultMessage: 'Find a task by its exact ID',
            })}
            onSearch={(value) => updateFilters({ taskId: value.trim() || undefined })}
            data-test-subj="taskManagerUiTaskIdSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            placeholder={i18n.translate('xpack.taskManagerUi.tasks.allTaskTypes', {
              defaultMessage: 'All task types',
            })}
            aria-label={i18n.translate('xpack.taskManagerUi.tasks.taskTypeFilter', {
              defaultMessage: 'Filter by task type',
            })}
            options={taskTypeOptions}
            selectedOptions={query.taskType ? [{ label: query.taskType }] : []}
            onChange={([selected]) => updateFilters({ taskType: selected?.label })}
            data-test-subj="taskManagerUiTaskTypeFilter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1} css={{ minWidth: '17em' }}>
          <EuiSelect
            fullWidth
            options={statusOptions}
            value={query.status ?? ''}
            aria-label={i18n.translate('xpack.taskManagerUi.tasks.statusFilter', {
              defaultMessage: 'Filter by status',
            })}
            onChange={(event) => updateFilters({ status: event.target.value || undefined })}
            data-test-subj="taskManagerUiStatusFilter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate('xpack.taskManagerUi.tasks.overdueOnly', {
              defaultMessage: 'Overdue only',
            })}
            checked={query.overdue}
            onChange={(event) => updateFilters({ overdue: event.target.checked })}
            data-test-subj="taskManagerUiOverdueFilter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable<TaskRow>
        tableCaption={i18n.translate('xpack.taskManagerUi.tasks.caption', {
          defaultMessage: 'Tasks',
        })}
        items={data?.tasks ?? []}
        itemId="id"
        columns={columns}
        loading={isFetching}
        error={
          error
            ? getErrorMessage(error) ??
              i18n.translate('xpack.taskManagerUi.tasks.loadError', {
                defaultMessage: 'Unable to load tasks.',
              })
            : undefined
        }
        noItemsMessage={<NoTasksMessage taskId={query.taskId} onSelectTask={onSelectTask} />}
        pagination={{
          pageIndex: query.page - 1,
          pageSize: query.perPage,
          totalItemCount: Math.min(data?.total ?? 0, MAX_RESULT_WINDOW),
          pageSizeOptions: [20, 50, 100],
        }}
        sorting={
          listsFailedTasks
            ? undefined
            : { sort: { field: query.sortField, direction: query.sortOrder } }
        }
        onChange={onTableChange}
        data-test-subj="taskManagerUiTasksTable"
      />
    </>
  );
};
