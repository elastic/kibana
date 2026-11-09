/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { Execution, ResultDocument, Task } from '../../common';
import { RESULT_INDEX } from '../../common';
import { formatDuration, formatTime } from '../lib/format';
import { OutputTable } from './output_table';
import { StatusBadge } from './status_badge';

const UNFINISHED = new Set<Task['status']>(['queued', 'running', 'retrying']);

export type OutputState =
  | { state: 'loading' }
  | { state: 'loaded'; doc: ResultDocument }
  | { state: 'error'; message: string };

const executionColumns: Array<EuiBasicTableColumn<Execution>> = [
  { field: 'execution', name: 'Execution', width: '90px' },
  {
    field: 'status',
    name: 'Status',
    width: '110px',
    render: (status: Execution['status']) => <StatusBadge status={status} />,
  },
  { field: 'workerId', name: 'Worker' },
  { field: 'startedAt', name: 'Started', render: formatTime },
  { field: 'durationMs', name: 'Duration', render: formatDuration },
  { field: 'error', name: 'Error', render: (error: string | null) => error ?? '—' },
];

const errorTitle = (task: Task): string => {
  const lastFinished = [...task.executions].reverse().find(({ finishedAt }) => finishedAt !== null);
  const failed = lastFinished ? `Execution ${lastFinished.execution} of ${task.maxExecutions}` : '';
  switch (task.status) {
    case 'retrying':
      return `${failed || 'The last execution'} failed; the next one starts at ${formatTime(
        task.nextExecutionAt
      )}`;
    case 'running':
    case 'queued':
      return `${failed || 'An earlier execution'} failed; execution ${task.execution} of ${
        task.maxExecutions
      } is ${task.status}`;
    case 'timed_out':
      return `Task timed out after ${task.timeout}`;
    default:
      return `Task ${task.status.replace('_', ' ')}`;
  }
};

const Output = ({ task, output }: { task: Task; output: OutputState | undefined }) => {
  if (task.status !== 'succeeded') {
    return null;
  }
  if (!output || output.state === 'loading') {
    return <EuiLoadingSpinner size="m" />;
  }
  if (output.state === 'error') {
    return (
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={`Couldn't read the output from ${RESULT_INDEX}`}
      >
        {output.message}
      </KbnWarningCallout>
    );
  }
  return <OutputTable doc={output.doc} />;
};

/** The expanded row of a task: its output, its error, and every execution. */
export const TaskDetails = ({ task, output }: { task: Task; output: OutputState | undefined }) => (
  <div data-test-subj={`taskRunnerPocTaskDetails-${task.taskId}`}>
    {task.error ? (
      <>
        <KbnDangerCallout announceOnMount size="s" title={errorTitle(task)}>
          <EuiCodeBlock fontSize="s" paddingSize="s" transparentBackground isCopyable>
            {task.error}
          </EuiCodeBlock>
        </KbnDangerCallout>
        <EuiSpacer size="m" />
      </>
    ) : null}
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={2}>
        <EuiTitle size="xxs">
          <h4>Output</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        {task.status === 'succeeded' ? (
          <Output task={task} output={output} />
        ) : (
          <EuiText size="s" color="subdued">
            {UNFINISHED.has(task.status)
              ? `Not available yet; the task is ${task.status}.`
              : `No output; the task ${task.status.replace('_', ' ')}.`}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiDescriptionList
          compressed
          type="column"
          listItems={[
            { title: 'Task', description: task.taskId },
            { title: 'Job', description: task.jobId },
            { title: 'Flow', description: task.flowId },
            { title: 'Created', description: formatTime(task.createdAt) },
            { title: 'Timeout', description: task.timeout },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiTitle size="xxs">
      <h4>Executions</h4>
    </EuiTitle>
    <EuiBasicTable<Execution>
      tableCaption={`Executions of task ${task.taskId}`}
      items={task.executions}
      itemId="execution"
      columns={executionColumns}
      compressed
      noItemsMessage="No execution has started yet"
    />
  </div>
);
