/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCode,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Job, Task } from '../../common';
import type { TaskRunnerApi } from '../api';
import { errorMessage } from '../api';
import { resultInDiscoverUrl } from '../lib/discover';
import { formatDuration, formatTime } from '../lib/format';
import { jobKindText } from '../lib/jobs';
import { StatusBadge } from './status_badge';
import type { OutputState } from './task_details';
import { TaskDetails } from './task_details';

interface TasksTableProps {
  api: TaskRunnerApi;
  share: SharePluginStart;
  tasks: Task[] | undefined;
  /** When given, adds a Job column showing how each task's job fires. */
  jobsById?: Map<string, Job>;
  noItemsMessage?: string;
  'data-test-subj'?: string;
}

const executionText = (task: Task): string => {
  const text = `execution ${task.execution} of ${task.maxExecutions}`;
  return task.status === 'retrying' && task.nextExecutionAt
    ? `${text}, next at ${formatTime(task.nextExecutionAt)}`
    : text;
};

export const TasksTable = ({
  api,
  share,
  tasks,
  jobsById,
  noItemsMessage = 'No tasks yet. Submit a query to create one.',
  'data-test-subj': dataTestSubj = 'taskRunnerPocTasksTable',
}: TasksTableProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [outputs, setOutputs] = useState<Record<string, OutputState>>({});

  const toggle = (taskId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });

  useEffect(() => {
    for (const task of tasks ?? []) {
      if (expanded.has(task.taskId) && task.status === 'succeeded' && !outputs[task.taskId]) {
        const { taskId } = task;
        setOutputs((current) => ({ ...current, [taskId]: { state: 'loading' } }));
        api.getTaskOutput(taskId).then(
          (doc) => setOutputs((current) => ({ ...current, [taskId]: { state: 'loaded', doc } })),
          (error) =>
            setOutputs((current) => ({
              ...current,
              [taskId]: { state: 'error', message: errorMessage(error) },
            }))
        );
      }
    }
  }, [api, tasks, expanded, outputs]);

  const columns: Array<EuiBasicTableColumn<Task>> = [
    {
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>Show details</span>
        </EuiScreenReaderOnly>
      ),
      render: (task: Task) => {
        const label = expanded.has(task.taskId) ? 'Hide details' : 'Show details';
        return (
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              onClick={() => toggle(task.taskId)}
              aria-label={label}
              aria-expanded={expanded.has(task.taskId)}
              iconType={expanded.has(task.taskId) ? 'chevronSingleDown' : 'chevronSingleRight'}
              data-test-subj={`taskRunnerPocToggle-${task.taskId}`}
            />
          </EuiToolTip>
        );
      },
    },
    {
      field: 'status',
      name: 'Status',
      width: '110px',
      render: (status: Task['status']) => <StatusBadge status={status} />,
    },
    {
      name: 'Query',
      render: (task: Task) => (
        <EuiToolTip content={task.taskId}>
          <EuiCode transparentBackground>{task.params.query ?? task.taskType}</EuiCode>
        </EuiToolTip>
      ),
    },
    ...(jobsById
      ? [
          {
            name: 'Job',
            width: '110px',
            render: (task: Task) => (
              <EuiToolTip content={task.jobId}>
                <EuiText size="s" color="subdued" tabIndex={0}>
                  {jobKindText(jobsById.get(task.jobId)) ?? '—'}
                </EuiText>
              </EuiToolTip>
            ),
          },
        ]
      : []),
    { name: 'Execution', width: '190px', render: executionText },
    { field: 'startedAt', name: 'Started', width: '140px', render: formatTime },
    { field: 'durationMs', name: 'Duration', width: '90px', render: formatDuration },
    {
      name: 'Rows',
      width: '70px',
      align: 'right',
      render: (task: Task) => task.result?.rows ?? '—',
    },
    {
      field: 'error',
      name: 'Error',
      truncateText: true,
      render: (error: string | null) =>
        error ? (
          <EuiText size="s" color="danger" title={error}>
            {error}
          </EuiText>
        ) : (
          '—'
        ),
    },
    {
      name: 'Output',
      width: '70px',
      render: (task: Task) =>
        task.status === 'succeeded' && task.finishedAt ? (
          <EuiToolTip content="Open the result document in Discover" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="discoverApp"
              href={resultInDiscoverUrl(share, task.taskId, task.finishedAt)}
              target="_blank"
              aria-label="Open the result document in Discover"
              data-test-subj={`taskRunnerPocResultInDiscover-${task.taskId}`}
            />
          </EuiToolTip>
        ) : null,
    },
  ];

  const itemIdToExpandedRowMap = Object.fromEntries(
    (tasks ?? [])
      .filter(({ taskId }) => expanded.has(taskId))
      .map((task) => [task.taskId, <TaskDetails task={task} output={outputs[task.taskId]} />])
  );

  return (
    <EuiBasicTable<Task>
      tableCaption="Tasks"
      items={tasks ?? []}
      itemId="taskId"
      columns={columns}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      loading={tasks === undefined}
      noItemsMessage={tasks === undefined ? 'Loading tasks…' : noItemsMessage}
      data-test-subj={dataTestSubj}
    />
  );
};
