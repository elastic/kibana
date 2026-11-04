/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageSection,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { TaskNode } from '@kbn/task-manager-plugin/common';
import { BACKGROUND_TASKS_TITLE } from '../constants';
import type { TasksApi } from './api';
import { RollupBadges, StatusBadge } from './status_badge';
import { TaskFlyout } from './task_flyout';
import type { TaskRow } from './task_tree';
import { buildTaskRows, flattenTaskRows } from './task_tree';

const ALL_STATUSES = [
  'running',
  'claiming',
  'waiting',
  'idle',
  'done',
  'failed',
  'cancelled',
  'dead_letter',
  'unrecognized',
];
const DEFAULT_STATUSES = ['running', 'claiming', 'waiting'];
const REFRESH_INTERVAL_MS = 5000;

const relativeTime = (iso: string | null): string => {
  if (!iso) {
    return '—';
  }
  const deltaSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(deltaSeconds);
  const unit = abs < 60 ? 's' : abs < 3600 ? 'm' : abs < 86400 ? 'h' : 'd';
  const amount =
    unit === 's'
      ? abs
      : unit === 'm'
      ? Math.round(abs / 60)
      : unit === 'h'
      ? Math.round(abs / 3600)
      : Math.round(abs / 86400);
  return deltaSeconds <= 0 ? `${amount}${unit} ago` : `in ${amount}${unit}`;
};

const toOptions = (values: string[]): Array<EuiComboBoxOptionOption<string>> =>
  values.map((value) => ({ label: value, value }));

const toggleChildrenLabel = i18n.translate(
  'xpack.taskManagerUi.backgroundTasks.toggleChildrenAriaLabel',
  { defaultMessage: 'Toggle sub-tasks' }
);

/** Relative time with the absolute timestamp as a native tooltip. */
const TimeCell = ({ value }: { value: string | null }) =>
  value ? <span title={new Date(value).toLocaleString()}>{relativeTime(value)}</span> : <>—</>;

interface BackgroundTasksPageProps {
  api: TasksApi;
}

export const BackgroundTasksPage = ({ api }: BackgroundTasksPageProps) => {
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [taskType, setTaskType] = useState<string | undefined>();
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [idFilter, setIdFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [matched, setMatched] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    api
      .getTaskTypes()
      .then(({ task_types: types }) => setTaskTypes(types))
      .catch(() => setTaskTypes([]));
  }, [api]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const response = await api.listTasks(
          { statuses, taskType, id: idFilter.trim() || undefined, size: 500 },
          signal
        );
        if (signal?.aborted) {
          return;
        }
        setTasks(response.tasks);
        setMatched(response.matched);
        setTruncated(response.truncated);
        setError(null);
        setLastRefreshed(new Date());
      } catch (err) {
        if (!signal?.aborted) {
          setError(err?.body?.message ?? err?.message ?? String(err));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [api, statuses, taskType, idFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    if (!autoRefresh) {
      return () => controller.abort();
    }
    const timer = setInterval(() => load(controller.signal), REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [load, autoRefresh]);

  const rows = useMemo(() => flattenTaskRows(buildTaskRows(tasks), collapsed), [tasks, collapsed]);

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const columns: Array<EuiBasicTableColumn<TaskRow>> = [
    {
      field: 'task.id',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.task', {
        defaultMessage: 'Task',
      }),
      width: '40%',
      render: (_: unknown, row: TaskRow) => {
        const { task, level, children } = row;
        const label = task.child_key ?? task.id;
        return (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            css={css`
              padding-left: ${level * 20}px;
            `}
          >
            <EuiFlexItem grow={false}>
              {children.length ? (
                <EuiToolTip content={toggleChildrenLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType={collapsed.has(task.id) ? 'arrowRight' : 'arrowDown'}
                    aria-label={toggleChildrenLabel}
                    onClick={() => toggleCollapsed(task.id)}
                    size="xs"
                  />
                </EuiToolTip>
              ) : (
                <span style={{ display: 'inline-block', width: 24 }} />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={task.id}>
                <EuiLink onClick={() => setSelectedTaskId(task.id)}>
                  <EuiText size="s" color={task.matched ? undefined : 'subdued'} component="span">
                    {label}
                  </EuiText>
                </EuiLink>
              </EuiToolTip>
            </EuiFlexItem>
            {task.recurring && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" component="span">
                  {i18n.translate('xpack.taskManagerUi.backgroundTasks.recurring', {
                    defaultMessage: '(recurring)',
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'task.task_type',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.type', {
        defaultMessage: 'Type',
      }),
      truncateText: true,
    },
    {
      field: 'task.status',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.status', {
        defaultMessage: 'Status',
      }),
      width: '110px',
      render: (_: unknown, { task }: TaskRow) => <StatusBadge task={task} />,
    },
    {
      field: 'rollup',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.subTasks', {
        defaultMessage: 'Sub-tasks',
      }),
      render: (_: unknown, { rollup, task }: TaskRow) =>
        rollup ? (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            <RollupBadges rollup={rollup} />
          </EuiFlexGroup>
        ) : task.has_children ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.taskManagerUi.backgroundTasks.childrenNotLoaded', {
              defaultMessage: 'has sub-tasks',
            })}
          </EuiText>
        ) : (
          '—'
        ),
    },
    {
      field: 'task.attempts',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.attempts', {
        defaultMessage: 'Attempts',
      }),
      width: '90px',
      align: 'right',
    },
    {
      field: 'task.run_at',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.runAt', {
        defaultMessage: 'Run at',
      }),
      width: '110px',
      render: (value: string) => <TimeCell value={value} />,
    },
    {
      field: 'task.started_at',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.startedAt', {
        defaultMessage: 'Started',
      }),
      width: '110px',
      render: (value: string | null) => <TimeCell value={value} />,
    },
    {
      field: 'task.owner_id',
      name: i18n.translate('xpack.taskManagerUi.backgroundTasks.columns.owner', {
        defaultMessage: 'Owner',
      }),
      width: '140px',
      truncateText: true,
      render: (value: string | null) => (value ? value.replace(/^kibana:/, '') : '—'),
    },
  ];

  return (
    <div data-test-subj="backgroundTasksPage">
      <AppHeader
        title={BACKGROUND_TASKS_TITLE}
        spacing="bleed"
        description={i18n.translate('xpack.taskManagerUi.backgroundTasks.description', {
          defaultMessage:
            'Tasks in the Task Manager index, grouped into parent and sub-task trees. Read-only.',
        })}
      />
      <EuiPageSection paddingSize="l">
        <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
          <EuiFlexItem grow={2}>
            <EuiComboBox
              compressed
              aria-label={i18n.translate('xpack.taskManagerUi.backgroundTasks.statusFilter', {
                defaultMessage: 'Status',
              })}
              placeholder={i18n.translate(
                'xpack.taskManagerUi.backgroundTasks.statusFilterPlaceholder',
                { defaultMessage: 'Any status' }
              )}
              options={toOptions(ALL_STATUSES)}
              selectedOptions={toOptions(statuses)}
              onChange={(selected) => setStatuses(selected.map(({ value }) => value ?? ''))}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiComboBox
              compressed
              singleSelection={{ asPlainText: true }}
              aria-label={i18n.translate('xpack.taskManagerUi.backgroundTasks.typeFilter', {
                defaultMessage: 'Task type',
              })}
              placeholder={i18n.translate(
                'xpack.taskManagerUi.backgroundTasks.typeFilterPlaceholder',
                { defaultMessage: 'Any task type' }
              )}
              options={toOptions(taskTypes)}
              selectedOptions={taskType ? toOptions([taskType]) : []}
              onChange={(selected) => setTaskType(selected[0]?.value)}
              onCreateOption={(value) => setTaskType(value)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiFieldSearch
              compressed
              placeholder={i18n.translate(
                'xpack.taskManagerUi.backgroundTasks.idFilterPlaceholder',
                {
                  defaultMessage: 'Exact task id, or root id of a tree',
                }
              )}
              value={idFilter}
              onChange={(event) => setIdFilter(event.target.value)}
              isClearable
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.taskManagerUi.backgroundTasks.autoRefresh', {
                defaultMessage: 'Auto-refresh',
              })}
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="refresh" onClick={() => load()} isLoading={isLoading}>
              {i18n.translate('xpack.taskManagerUi.backgroundTasks.refresh', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.taskManagerUi.backgroundTasks.summary', {
            defaultMessage:
              '{matched} matching {matched, plural, one {task} other {tasks}}, {total} shown with tree context{truncated, select, true { (truncated; narrow the filter)} other {}}. {refreshed}',
            values: {
              matched,
              total: tasks.length,
              truncated: String(truncated),
              refreshed: lastRefreshed
                ? i18n.translate('xpack.taskManagerUi.backgroundTasks.lastRefreshed', {
                    defaultMessage: 'Last refreshed {time}.',
                    values: { time: lastRefreshed.toLocaleTimeString() },
                  })
                : '',
            },
          })}
        </EuiText>
        <EuiSpacer size="s" />

        {error && (
          <>
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('xpack.taskManagerUi.backgroundTasks.loadError', {
                defaultMessage: 'Could not load tasks',
              })}
            >
              {error}
            </KbnDangerCallout>
            <EuiSpacer size="s" />
          </>
        )}

        <EuiBasicTable<TaskRow>
          tableCaption={BACKGROUND_TASKS_TITLE}
          items={rows}
          itemId={({ task }) => task.id}
          columns={columns}
          loading={isLoading && !tasks.length}
          noItemsMessage={i18n.translate('xpack.taskManagerUi.backgroundTasks.noTasks', {
            defaultMessage: 'No tasks match the current filter.',
          })}
          rowProps={({ task }) => ({
            'data-test-subj': `backgroundTaskRow-${task.id}`,
          })}
        />
      </EuiPageSection>

      {selectedTaskId && (
        <TaskFlyout
          api={api}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onSelectTask={setSelectedTaskId}
        />
      )}
    </div>
  );
};
