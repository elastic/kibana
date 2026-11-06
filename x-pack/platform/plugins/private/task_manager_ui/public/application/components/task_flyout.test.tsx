/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core/public/mocks';
import {
  createHttpError,
  createTaskDetailResponse,
  createTaskSummary,
  mockHttpGet,
  renderWithProviders,
} from '../test_utils';
import { formatDateTime } from '../lib/format';
import { TaskFlyout } from './task_flyout';

const TIME_RANGE = { start: '2026-10-28T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };

describe('TaskFlyout', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('explains why the task will not run and lists its recent runs', async () => {
    mockHttpGet(http, { task: createTaskDetailResponse() });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    const explanation = await screen.findByTestId('taskManagerUiExplanation');
    expect(explanation).toHaveTextContent("This task won't run");
    expect(explanation).toHaveTextContent(
      'The task failed after 3 of 3 attempts and will not be retried.'
    );
    expect(screen.getByText('Every 1h')).toBeInTheDocument();
    expect(screen.getByText('Reporting: execute job')).toBeInTheDocument();

    const runs = screen.getByTestId('taskManagerUiRecentRuns');
    expect(within(runs).getByText('failure')).toBeInTheDocument();
    expect(within(runs).getByText('1.5 s')).toBeInTheDocument();
    expect(within(runs).getByText('Boom')).toBeInTheDocument();
    expect(within(runs).getByText('node-1')).toBeInTheDocument();
    expect(within(runs).getByTestId('taskManagerUiCopyNodeId')).toHaveAccessibleName(
      'Copy node ID'
    );
    expect(http.get).toHaveBeenCalledWith('/internal/task_manager/ui/tasks/task-1', {
      query: TIME_RANGE,
      signal: expect.any(AbortSignal),
    });
    expect(screen.queryByTestId('taskManagerUiFailuresInWindow')).not.toBeInTheDocument();
  });

  it('shows the full error of a run in a popover', async () => {
    const errorMessage =
      'Error: Request timed out\n    at Object.run (/usr/share/kibana/task.js:1:1)';
    mockHttpGet(http, {
      task: createTaskDetailResponse({
        recent_runs: [
          {
            timestamp: '2026-11-04T10:00:00.000Z',
            outcome: 'failure',
            error_message: errorMessage,
          },
        ],
      }),
    });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    const runs = await screen.findByTestId('taskManagerUiRecentRuns');
    expect(screen.queryByTestId('taskManagerUiRunError')).not.toBeInTheDocument();
    await userEvent.click(within(runs).getByRole('button', { name: 'Show full error' }));

    expect(await screen.findByTestId('taskManagerUiRunError')).toHaveTextContent(
      'at Object.run (/usr/share/kibana/task.js:1:1)'
    );
  });

  it('shows failures in the time range that are older than the recent runs', async () => {
    mockHttpGet(http, {
      task: createTaskDetailResponse({
        task: createTaskSummary({ status: 'idle', attempts: 0 }),
        explanation: { verdict: 'ok', reasons: [] },
        recent_runs: [{ timestamp: '2026-11-04T10:00:00.000Z', outcome: 'success' }],
        failures_in_window: {
          window: TIME_RANGE,
          count: 2,
          last_failure: {
            at: '2026-10-31T13:26:34.000Z',
            outcome: 'failure',
            error_message: 'Request timed out',
          },
        },
      }),
    });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    const failures = await screen.findByTestId('taskManagerUiFailuresInWindow');
    expect(failures).toHaveTextContent('Failures in time range');
    expect(failures).toHaveTextContent(
      `Time range${formatDateTime(TIME_RANGE.start)} to ${formatDateTime(TIME_RANGE.end)}`
    );
    expect(failures).toHaveTextContent('Failed runs2');
    expect(within(failures).getByTestId('taskManagerUiLastFailureError')).toHaveTextContent(
      'Request timed out'
    );
  });

  it('does not repeat the error of a latest failure that the explanation shows', async () => {
    mockHttpGet(http, {
      task: createTaskDetailResponse({
        task: createTaskSummary({ status: 'idle', attempts: 0 }),
        explanation: {
          verdict: 'attention',
          reasons: [
            {
              code: 'last_run_failed',
              consecutive_failures: 1,
              runs_checked: 1,
              failed_at: '2026-11-02T11:00:05.000Z',
              error_message: 'Boom',
            },
          ],
        },
        failures_in_window: {
          window: TIME_RANGE,
          count: 1,
          last_failure: {
            at: '2026-11-02T11:00:05.000Z',
            outcome: 'failure',
            error_message: 'Boom',
          },
        },
      }),
    });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    const failures = await screen.findByTestId('taskManagerUiFailuresInWindow');
    expect(failures).toHaveTextContent('Failures in time range');
    expect(within(failures).queryByTestId('taskManagerUiLastFailureError')).not.toBeInTheDocument();
  });

  it('shows the latest error when the most recent runs failed', async () => {
    mockHttpGet(http, {
      task: createTaskDetailResponse({
        task: createTaskSummary({ status: 'idle', attempts: 0 }),
        explanation: {
          verdict: 'attention',
          reasons: [
            {
              code: 'last_run_failed',
              consecutive_failures: 2,
              runs_checked: 2,
              failed_at: '2026-11-02T11:00:05.000Z',
              error_message: 'parsing_exception: unknown query [bogus]',
            },
          ],
        },
      }),
    });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    const explanation = await screen.findByTestId('taskManagerUiExplanation');
    expect(explanation).toHaveTextContent('This task needs attention');
    expect(explanation).toHaveTextContent('All of the last 2 recorded runs failed');
    expect(within(explanation).getByTestId('taskManagerUiLastRunError')).toHaveTextContent(
      'parsing_exception: unknown query [bogus]'
    );
  });

  it('shows the run history of a removed task without task details', async () => {
    mockHttpGet(http, {
      task: createTaskDetailResponse({
        task: undefined,
        task_type: 'actions:.index',
        explanation: {
          verdict: 'attention',
          reasons: [
            { code: 'removed' },
            {
              code: 'last_run_failed',
              consecutive_failures: 1,
              runs_checked: 1,
              failed_at: '2026-11-02T11:00:05.000Z',
              error_message: 'error indexing documents',
            },
          ],
        },
      }),
    });

    renderWithProviders(
      <TaskFlyout taskId="removed-task" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    const explanation = await screen.findByTestId('taskManagerUiExplanation');
    expect(explanation).toHaveTextContent('This task no longer exists.');
    expect(within(explanation).getByTestId('taskManagerUiLastRunError')).toHaveTextContent(
      'error indexing documents'
    );
    expect(screen.getByText('actions:.index')).toBeInTheDocument();
    expect(screen.queryByText('Task details')).not.toBeInTheDocument();
    expect(screen.getByTestId('taskManagerUiRecentRuns')).toBeInTheDocument();
  });

  it('shows an on-track task without reasons', async () => {
    mockHttpGet(http, {
      task: createTaskDetailResponse({
        task: createTaskSummary({ status: 'idle', attempts: 0 }),
        explanation: { verdict: 'ok', reasons: [] },
        recent_runs: [],
      }),
    });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    expect(await screen.findByTestId('taskManagerUiExplanation')).toHaveTextContent(
      'This task is on track'
    );
    expect(
      screen.getByText('No runs recorded in the event log for this task.')
    ).toBeInTheDocument();
  });

  it('tells the user when the task type is not registered or the event log is unavailable', async () => {
    mockHttpGet(http, {
      task: createTaskDetailResponse({ definition: undefined, event_log_available: false }),
    });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    expect(
      await screen.findByText('This task type is not registered on this Kibana node.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Run history is unavailable because the event log is not available.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('taskManagerUiRecentRuns')).not.toBeInTheDocument();
  });

  it('shows a not found prompt when the task no longer exists', async () => {
    mockHttpGet(http, { task: createHttpError(404, 'Task task-1 not found') });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    expect(await screen.findByText('Task not found')).toBeInTheDocument();
  });

  it('shows the error message when the task fails to load', async () => {
    mockHttpGet(http, { task: createHttpError(500, 'Internal Server Error') });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={jest.fn()} />,
      http
    );

    expect(await screen.findByText('Unable to load the task')).toBeInTheDocument();
    expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
  });

  it('calls onClose when the flyout is closed', async () => {
    const onClose = jest.fn();
    mockHttpGet(http, { task: createTaskDetailResponse() });

    renderWithProviders(
      <TaskFlyout taskId="task-1" timeRange={TIME_RANGE} onClose={onClose} />,
      http
    );
    await screen.findByTestId('taskManagerUiExplanation');
    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
