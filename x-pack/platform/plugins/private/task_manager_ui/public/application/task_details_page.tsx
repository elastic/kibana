/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { TaskNode, TaskTreeResponse } from '@kbn/task-manager-plugin/common';
import { BACKGROUND_TASKS_TITLE } from '../constants';
import type { TasksApi } from './api';
import { RollupBadges, StatusBadge } from './status_badge';
import { TaskFlyout } from './task_flyout';
import type { TaskRow } from './task_tree';
import { buildTaskRows } from './task_tree';

const REFRESH_INTERVAL_MS = 3000;

type PanelColor = 'primary' | 'accent' | 'subdued' | 'success' | 'danger' | 'warning' | 'plain';

const STATUS_PANEL_COLORS: Record<string, PanelColor> = {
  running: 'primary',
  claiming: 'primary',
  waiting: 'accent',
  idle: 'subdued',
  done: 'success',
  failed: 'danger',
  dead_letter: 'danger',
  cancelled: 'warning',
  unrecognized: 'warning',
};

const STATUS_HINTS: Record<string, string> = {
  running: i18n.translate('xpack.taskManagerUi.details.hint.running', {
    defaultMessage: 'Running on a Kibana node',
  }),
  claiming: i18n.translate('xpack.taskManagerUi.details.hint.claiming', {
    defaultMessage: 'Being claimed by a Kibana node',
  }),
  waiting: i18n.translate('xpack.taskManagerUi.details.hint.waiting', {
    defaultMessage: 'Yielded; waiting for sub-tasks or a deadline',
  }),
  idle: i18n.translate('xpack.taskManagerUi.details.hint.idle', {
    defaultMessage: 'Scheduled; waiting to be picked up (or to retry)',
  }),
  done: i18n.translate('xpack.taskManagerUi.details.hint.done', {
    defaultMessage: 'Finished successfully',
  }),
  failed: i18n.translate('xpack.taskManagerUi.details.hint.failed', {
    defaultMessage: 'Failed after all attempts',
  }),
  cancelled: i18n.translate('xpack.taskManagerUi.details.hint.cancelled', {
    defaultMessage: 'Cancelled by its parent',
  }),
};

/** Current time, re-rendered once a second, for live countdowns. */
const useNow = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

const formatCountdown = (iso: string | null, now: number): string => {
  if (!iso) {
    return '';
  }
  const total = Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** The deadline a task is counting down to, if any, and what happens when it is reached. */
const getCountdown = (
  task: TaskNode,
  childrenSettled: boolean,
  now: number
): { label: string; deadline: string } | null => {
  if (task.status === 'waiting') {
    return {
      deadline: task.run_at,
      label: childrenSettled
        ? i18n.translate('xpack.taskManagerUi.details.countdown.resumesToFinish', {
            defaultMessage: 'All sub-tasks settled; resumes and cleans up in {time}',
            values: { time: formatCountdown(task.run_at, now) },
          })
        : i18n.translate('xpack.taskManagerUi.details.countdown.resumes', {
            defaultMessage: 'Resumes in {time} at the latest',
            values: { time: formatCountdown(task.run_at, now) },
          }),
    };
  }
  if (task.status === 'idle') {
    return {
      deadline: task.run_at,
      label:
        task.attempts > 0
          ? i18n.translate('xpack.taskManagerUi.details.countdown.retries', {
              defaultMessage: 'Failed; retries in {time}',
              values: { time: formatCountdown(task.run_at, now) },
            })
          : i18n.translate('xpack.taskManagerUi.details.countdown.runs', {
              defaultMessage: 'Runs in {time}',
              values: { time: formatCountdown(task.run_at, now) },
            }),
    };
  }
  if (task.status === 'running' && task.retry_at) {
    return {
      deadline: task.retry_at,
      label: i18n.translate('xpack.taskManagerUi.details.countdown.timesOut', {
        defaultMessage: 'Times out in {time}',
        values: { time: formatCountdown(task.retry_at, now) },
      }),
    };
  }
  return null;
};

interface TaskBoxProps {
  task: TaskNode;
  isRoot: boolean;
  /** True when every descendant has ended, i.e. the next wake of a waiting parent is its last. */
  childrenSettled: boolean;
  now: number;
  onSelect: (id: string) => void;
}

const TaskBox = ({ task, isRoot, childrenSettled, now, onSelect }: TaskBoxProps) => {
  const { euiTheme } = useEuiTheme();
  const countdown = getCountdown(task, childrenSettled, now);
  return (
    <EuiPanel
      color={STATUS_PANEL_COLORS[task.status] ?? 'plain'}
      hasBorder
      paddingSize="m"
      onClick={() => onSelect(task.id)}
      data-test-subj={`taskBox-${task.id}`}
      css={css`
        min-width: 220px;
        max-width: ${isRoot ? '420px' : '260px'};
        text-align: left;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size={isRoot ? 'xs' : 'xxs'}>
            <h3
              css={css`
                word-break: break-all;
              `}
            >
              {isRoot ? task.id : task.child_key ?? task.id}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {task.task_type}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <StatusBadge task={task} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                {i18n.translate('xpack.taskManagerUi.details.attempts', {
                  defaultMessage: '{count, plural, one {# attempt} other {# attempts}}',
                  values: { count: task.attempts },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              padding-top: ${euiTheme.size.xs};
            `}
          >
            {STATUS_HINTS[task.status] ?? task.status}
          </EuiText>
        </EuiFlexItem>
        {countdown && (
          <EuiFlexItem>
            <EuiText size="xs" title={new Date(countdown.deadline).toLocaleTimeString()}>
              <strong>{countdown.label}</strong>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

interface TreeBoxesProps {
  row: TaskRow;
  isRoot: boolean;
  now: number;
  onSelect: (id: string) => void;
}

/** A task box with its sub-tasks laid out as a row of boxes underneath. */
const TreeBoxes = ({ row, isRoot, now, onSelect }: TreeBoxesProps) => {
  const { euiTheme } = useEuiTheme();
  const childrenSettled = row.rollup !== null && row.rollup.inProgress === 0;
  return (
    <EuiFlexGroup direction="column" alignItems="center" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <TaskBox
          task={row.task}
          isRoot={isRoot}
          childrenSettled={childrenSettled}
          now={now}
          onSelect={onSelect}
        />
      </EuiFlexItem>
      {row.children.length > 0 && (
        <>
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: 2px;
                height: ${euiTheme.size.l};
                background: ${euiTheme.colors.borderBasePlain};
              `}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="m"
              wrap
              justifyContent="center"
              alignItems="flexStart"
              responsive={false}
            >
              {row.children.map((child) => (
                <EuiFlexItem key={child.task.id} grow={false}>
                  <TreeBoxes row={child} isRoot={false} now={now} onSelect={onSelect} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};

interface TaskDetailsPageProps {
  api: TasksApi;
  taskId: string;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

export const TaskDetailsPage = ({ api, taskId, setBreadcrumbs }: TaskDetailsPageProps) => {
  const history = useHistory();
  const now = useNow();
  const [tree, setTree] = useState<TaskTreeResponse | null>(null);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const goBack = useCallback(() => history.push('/'), [history]);

  useEffect(() => {
    setBreadcrumbs([{ text: BACKGROUND_TASKS_TITLE, onClick: goBack }, { text: taskId }]);
  }, [setBreadcrumbs, taskId, goBack]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        // `taskId` is normally a root; resolve the root when a sub-task id is opened directly.
        let rootId = taskId;
        try {
          const { task } = await api.getTask(taskId, signal);
          rootId = task.root_id ?? task.id;
        } catch (err) {
          if (err?.response?.status !== 404) {
            throw err;
          }
        }
        const response = await api.getTree(rootId, signal);
        if (signal?.aborted) {
          return;
        }
        setTree(response);
        setGone(false);
        setError(null);
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        if (err?.response?.status === 404) {
          setGone(true);
          setError(null);
        } else {
          setError(err?.body?.message ?? err?.message ?? String(err));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [api, taskId]
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

  const rows = useMemo(() => (tree ? buildTaskRows(tree.nodes) : []), [tree]);
  const root = tree?.nodes.find(({ id }) => id === tree.root_id) ?? null;

  return (
    <div data-test-subj="taskDetailsPage">
      <AppHeader title={taskId} spacing="bleed" description={root?.task_type} />
      <EuiPageSection paddingSize="l">
        <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="chevronSingleLeft" onClick={goBack} size="s">
              {i18n.translate('xpack.taskManagerUi.details.back', {
                defaultMessage: 'All tasks',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{root && <StatusBadge task={root} />}</EuiFlexItem>
          <EuiFlexItem grow={true}>
            {tree && (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                <RollupBadges rollup={tree.rollup} />
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.taskManagerUi.details.autoRefresh', {
                defaultMessage: 'Auto-refresh',
              })}
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="refresh" onClick={() => load()} isLoading={isLoading}>
              {i18n.translate('xpack.taskManagerUi.details.refresh', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {error && (
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate('xpack.taskManagerUi.details.loadError', {
              defaultMessage: 'Could not load the task',
            })}
          >
            {error}
          </KbnDangerCallout>
        )}

        {gone && (
          <KbnWarningCallout
            announceOnMount
            title={i18n.translate('xpack.taskManagerUi.details.gone', {
              defaultMessage: 'This task no longer exists',
            })}
          >
            {i18n.translate('xpack.taskManagerUi.details.goneDescription', {
              defaultMessage:
                'Ad-hoc tasks are removed once they finish and clean up their sub-tasks. The last known tree is shown below, if any.',
            })}
          </KbnWarningCallout>
        )}

        {!tree && !gone && !error && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {rows.length > 0 && (
          <>
            <EuiSpacer size="m" />
            {rows.map((row) => (
              <TreeBoxes
                key={row.task.id}
                row={row}
                isRoot={row.task.id === tree?.root_id}
                now={now}
                onSelect={setSelectedTaskId}
              />
            ))}
          </>
        )}
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
