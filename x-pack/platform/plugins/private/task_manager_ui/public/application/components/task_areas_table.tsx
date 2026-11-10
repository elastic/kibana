/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TaskTypeSummary } from '@kbn/task-manager-plugin/common';
import { EMPTY_VALUE, formatPercent, formatRelativeTime } from '../lib/format';
import { summarizeAreas, type TaskAreaSummary } from '../lib/task_area';

export const TaskAreasTable: React.FC<{
  taskTypes: TaskTypeSummary[];
  isLoading: boolean;
  /** Rendered next to the search box, e.g. the group by control. */
  toolsRight: React.ReactElement;
  onSelectArea: (area: string) => void;
}> = ({ taskTypes, isLoading, toolsRight, onSelectArea }) => {
  const areas = useMemo(() => summarizeAreas(taskTypes), [taskTypes]);

  const search: EuiSearchBarProps = useMemo(
    () => ({
      box: {
        incremental: true,
        placeholder: i18n.translate('xpack.taskManagerUi.areas.searchPlaceholder', {
          defaultMessage: 'Search areas',
        }),
      },
      toolsRight,
    }),
    [toolsRight]
  );

  const columns: Array<EuiBasicTableColumn<TaskAreaSummary>> = useMemo(
    () => [
      {
        field: 'area',
        name: i18n.translate('xpack.taskManagerUi.areas.area', { defaultMessage: 'Area' }),
        nameTooltip: {
          content: i18n.translate('xpack.taskManagerUi.areas.areaTooltip', {
            defaultMessage:
              'The framework that registered the task type (alerting, actions), otherwise the first part of the task type name. It may not match the plugin that owns the task type.',
          }),
        },
        sortable: true,
        render: (area: string) => (
          <EuiLink onClick={() => onSelectArea(area)} data-test-subj="taskManagerUiAreaLink">
            {area}
          </EuiLink>
        ),
      },
      {
        field: 'taskTypes',
        name: i18n.translate('xpack.taskManagerUi.areas.taskTypes', {
          defaultMessage: 'Task types',
        }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'failingTaskTypes',
        name: i18n.translate('xpack.taskManagerUi.areas.failingTaskTypes', {
          defaultMessage: 'Failing task types',
        }),
        nameTooltip: {
          content: i18n.translate('xpack.taskManagerUi.areas.failingTaskTypesTooltip', {
            defaultMessage: 'Task types with at least one failed run in the selected time range.',
          }),
        },
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'tasks',
        name: i18n.translate('xpack.taskManagerUi.areas.tasks', { defaultMessage: 'Tasks' }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'overdue',
        name: i18n.translate('xpack.taskManagerUi.areas.overdue', { defaultMessage: 'Overdue' }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'tasksWithFailures',
        name: i18n.translate('xpack.taskManagerUi.areas.tasksWithFailures', {
          defaultMessage: 'Tasks with failures',
        }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'runs',
        name: i18n.translate('xpack.taskManagerUi.areas.runs', { defaultMessage: 'Runs' }),
        sortable: true,
        dataType: 'number',
      },
      {
        field: 'failedRuns',
        name: i18n.translate('xpack.taskManagerUi.areas.failedRuns', {
          defaultMessage: 'Failed runs',
        }),
        sortable: true,
        dataType: 'number',
        render: (failedRuns: number, area: TaskAreaSummary) =>
          area.runs > 0 ? `${failedRuns} (${formatPercent(area.failureRate)})` : EMPTY_VALUE,
      },
      {
        field: 'lastFailureAt',
        name: i18n.translate('xpack.taskManagerUi.areas.lastFailure', {
          defaultMessage: 'Last failure',
        }),
        sortable: true,
        render: (lastFailureAt: string | undefined, area: TaskAreaSummary) =>
          lastFailureAt ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{formatRelativeTime(lastFailureAt)}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="warning"
                  color="danger"
                  content={i18n.translate('xpack.taskManagerUi.areas.lastFailureTooltip', {
                    defaultMessage: '{taskType}: {message}',
                    values: {
                      taskType: area.lastFailureTaskType,
                      message: area.lastFailureMessage ?? EMPTY_VALUE,
                    },
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            EMPTY_VALUE
          ),
      },
    ],
    [onSelectArea]
  );

  return (
    <EuiInMemoryTable<TaskAreaSummary>
      tableCaption={i18n.translate('xpack.taskManagerUi.areas.caption', {
        defaultMessage: 'Task type areas',
      })}
      items={areas}
      itemId="area"
      columns={columns}
      loading={isLoading}
      search={search}
      sorting={{ sort: { field: 'failedRuns', direction: 'desc' } }}
      pagination={{ initialPageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
      data-test-subj="taskManagerUiTaskAreasTable"
    />
  );
};
