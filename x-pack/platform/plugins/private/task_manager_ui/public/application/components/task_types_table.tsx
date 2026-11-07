/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TaskTypeSummary } from '@kbn/task-manager-plugin/common';
import {
  EMPTY_VALUE,
  formatDuration,
  formatPercent,
  formatRelativeTime,
  getFailureRate,
  getRunCount,
} from '../lib/format';
import { onPlainLeftClick } from '../lib/routes';
import { getTaskTypeArea } from '../lib/task_area';
import { TaskAreasTable } from './task_areas_table';

type GroupBy = 'taskType' | 'area';

const GROUP_BY_OPTIONS: Array<{ id: GroupBy; label: string }> = [
  {
    id: 'taskType',
    label: i18n.translate('xpack.taskManagerUi.taskTypes.groupBy.taskType', {
      defaultMessage: 'Task type',
    }),
  },
  {
    id: 'area',
    label: i18n.translate('xpack.taskManagerUi.taskTypes.groupBy.area', {
      defaultMessage: 'Area',
    }),
  },
];

const isGroupBy = (id: string): id is GroupBy =>
  GROUP_BY_OPTIONS.some((option) => option.id === id);

const GroupBySelector: React.FC<{ value: GroupBy; onChange: (groupBy: GroupBy) => void }> = ({
  value,
  onChange,
}) => (
  <EuiButtonGroup
    legend={i18n.translate('xpack.taskManagerUi.taskTypes.groupBy.legend', {
      defaultMessage: 'Group by',
    })}
    options={GROUP_BY_OPTIONS}
    idSelected={value}
    onChange={(id) => {
      if (isGroupBy(id)) {
        onChange(id);
      }
    }}
    buttonSize="compressed"
    data-test-subj="taskManagerUiGroupBy"
  />
);

interface TaskTypeRow {
  taskType: string;
  area: string;
  title?: string;
  registered: boolean;
  tasks: number;
  overdue: number;
  tasksWithFailures: number;
  runs: number;
  failedRuns: number;
  failureRate?: number;
  p95DurationMs?: number;
  lastFailureAt?: string;
  lastFailureMessage?: string;
}

const toRow = (summary: TaskTypeSummary): TaskTypeRow => ({
  taskType: summary.task_type,
  area: getTaskTypeArea(summary.task_type, summary.definition?.task_type_group),
  title: summary.definition?.title,
  registered: summary.registered,
  tasks: summary.tasks,
  overdue: summary.overdue,
  tasksWithFailures: summary.runs?.failed_tasks ?? 0,
  runs: getRunCount(summary.runs),
  failedRuns: summary.runs?.failure ?? 0,
  failureRate: getFailureRate(summary.runs),
  p95DurationMs: summary.runs?.p95_duration_ms,
  lastFailureAt: summary.runs?.last_failure?.at,
  lastFailureMessage: summary.runs?.last_failure?.message,
});

export const TaskTypesTable: React.FC<{
  taskTypes: TaskTypeSummary[];
  isLoading: boolean;
  getTaskTypeHref: (taskType: string) => string;
  onSelectTaskType: (taskType: string) => void;
  onSelectFailedTasks: (taskType: string) => void;
}> = ({ taskTypes, isLoading, getTaskTypeHref, onSelectTaskType, onSelectFailedTasks }) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('taskType');
  const [selectedArea, setSelectedArea] = useState<string>();
  const rows = useMemo(() => taskTypes.map(toRow), [taskTypes]);
  const areaNames = useMemo(() => [...new Set(rows.map(({ area }) => area))].sort(), [rows]);

  const onGroupByChange = useCallback((newGroupBy: GroupBy) => {
    setSelectedArea(undefined);
    setGroupBy(newGroupBy);
  }, []);

  const onSelectArea = useCallback((area: string) => {
    setSelectedArea(area);
    setGroupBy('taskType');
  }, []);

  const groupBySelector = useMemo(
    () => <GroupBySelector value={groupBy} onChange={onGroupByChange} />,
    [groupBy, onGroupByChange]
  );

  const search: EuiSearchBarProps = useMemo(
    () => ({
      box: {
        incremental: true,
        placeholder: i18n.translate('xpack.taskManagerUi.taskTypes.searchPlaceholder', {
          defaultMessage: 'Search task types',
        }),
      },
      defaultQuery: selectedArea
        ? Query.MATCH_ALL.addOrFieldValue('area', selectedArea, true, 'exact')
        : undefined,
      filters: [
        {
          type: 'field_value_selection',
          field: 'area',
          name: i18n.translate('xpack.taskManagerUi.taskTypes.areaFilter', {
            defaultMessage: 'Area',
          }),
          multiSelect: 'or',
          operator: 'exact',
          options: areaNames.map((area) => ({ value: area, name: area })),
        },
      ],
      toolsRight: groupBySelector,
    }),
    [selectedArea, areaNames, groupBySelector]
  );

  const columns: Array<EuiBasicTableColumn<TaskTypeRow>> = useMemo(
    () => [
      {
        field: 'taskType',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.taskType', {
          defaultMessage: 'Task type',
        }),
        sortable: true,
        width: '22em',
        render: (taskType: string, row: TaskTypeRow) => (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={getTaskTypeHref(taskType)}
                    onClick={onPlainLeftClick(() => onSelectTaskType(taskType))}
                    data-test-subj="taskManagerUiTaskTypeLink"
                  >
                    {taskType}
                  </EuiLink>
                </EuiFlexItem>
                {!row.registered && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">
                      {i18n.translate('xpack.taskManagerUi.taskTypes.notRegistered', {
                        defaultMessage: 'Not registered',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            {row.title && row.title !== taskType && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {row.title}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'tasks',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.tasks', { defaultMessage: 'Tasks' }),
        nameTooltip: {
          content: i18n.translate('xpack.taskManagerUi.taskTypes.tasksTooltip', {
            defaultMessage:
              'Tasks stored right now. One-time tasks are removed after they run, so their history only appears in the run columns.',
          }),
        },
        sortable: true,
        dataType: 'number',
        render: (tasks: number, row: TaskTypeRow) =>
          tasks === 0 && row.runs > 0 ? (
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>{tasks}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="info"
                  color="subdued"
                  content={i18n.translate('xpack.taskManagerUi.taskTypes.removedAfterRunHint', {
                    defaultMessage:
                      'No tasks of this type are stored right now, but some ran in the selected time range. They were likely removed after running, as one-time tasks are.',
                  })}
                  iconProps={{ 'data-test-subj': 'taskManagerUiRemovedAfterRunHint' }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            tasks
          ),
      },
      {
        field: 'overdue',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.overdue', {
          defaultMessage: 'Overdue',
        }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'tasksWithFailures',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.tasksWithFailures', {
          defaultMessage: 'Tasks with failures',
        }),
        nameTooltip: {
          content: i18n.translate('xpack.taskManagerUi.taskTypes.tasksWithFailuresTooltip', {
            defaultMessage:
              'Tasks with at least one failed run in the selected time range, including one-time tasks that were removed after failing.',
          }),
        },
        sortable: true,
        dataType: 'number',
        render: (tasksWithFailures: number, row: TaskTypeRow) => {
          if (row.runs === 0) {
            return EMPTY_VALUE;
          }
          return tasksWithFailures > 0 ? (
            <EuiLink
              onClick={() => onSelectFailedTasks(row.taskType)}
              data-test-subj="taskManagerUiTaskTypeFailuresLink"
            >
              {tasksWithFailures}
            </EuiLink>
          ) : (
            tasksWithFailures
          );
        },
      },
      {
        field: 'runs',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.runs', { defaultMessage: 'Runs' }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'failedRuns',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.failedRuns', {
          defaultMessage: 'Failed runs',
        }),
        sortable: true,
        dataType: 'number',
        render: (failedRuns: number, row: TaskTypeRow) =>
          row.runs > 0 ? `${failedRuns} (${formatPercent(row.failureRate)})` : EMPTY_VALUE,
      },
      {
        field: 'p95DurationMs',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.p95Duration', {
          defaultMessage: 'p95 duration',
        }),
        sortable: true,
        dataType: 'number',
        render: (p95DurationMs?: number) => formatDuration(p95DurationMs),
      },
      {
        field: 'lastFailureAt',
        name: i18n.translate('xpack.taskManagerUi.taskTypes.lastFailure', {
          defaultMessage: 'Last failure',
        }),
        sortable: true,
        render: (lastFailureAt: string | undefined, row: TaskTypeRow) =>
          lastFailureAt ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{formatRelativeTime(lastFailureAt)}</EuiFlexItem>
              {row.lastFailureMessage && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip type="warning" color="danger" content={row.lastFailureMessage} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ) : (
            EMPTY_VALUE
          ),
      },
    ],
    [getTaskTypeHref, onSelectTaskType, onSelectFailedTasks]
  );

  if (groupBy === 'area') {
    return (
      <TaskAreasTable
        taskTypes={taskTypes}
        isLoading={isLoading}
        toolsRight={groupBySelector}
        onSelectArea={onSelectArea}
      />
    );
  }

  return (
    <EuiInMemoryTable<TaskTypeRow>
      tableCaption={i18n.translate('xpack.taskManagerUi.taskTypes.caption', {
        defaultMessage: 'Task types',
      })}
      items={rows}
      itemId="taskType"
      columns={columns}
      loading={isLoading}
      search={search}
      sorting={{ sort: { field: 'failedRuns', direction: 'desc' } }}
      pagination={{ initialPageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
      data-test-subj="taskManagerUiTaskTypesTable"
    />
  );
};
