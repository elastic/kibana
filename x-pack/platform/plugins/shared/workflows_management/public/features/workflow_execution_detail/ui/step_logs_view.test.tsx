/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import type { StepLogEntry, StepLogsApi, StepLogsConfig } from '@kbn/workflows-extensions/public';
import { ansiToSpans, applyAnsiCode, StepLogsView } from './step_logs_view';
import { createMockStepExecutionDto } from '../../../shared/test_utils';

describe('applyAnsiCode', () => {
  it('clears foreground, background, and bold on per-attribute resets', () => {
    const styled = {
      fg: '#cd3131',
      bg: '#000000',
      bold: true,
    };

    expect(applyAnsiCode([39], 0, styled, '39').state).toEqual({
      fg: undefined,
      bg: '#000000',
      bold: true,
    });
    expect(applyAnsiCode([49], 0, styled, '49').state).toEqual({
      fg: '#cd3131',
      bg: undefined,
      bold: true,
    });
    expect(applyAnsiCode([22], 0, styled, '22').state).toEqual({
      fg: '#cd3131',
      bg: '#000000',
      bold: false,
    });
  });
});

describe('ansiToSpans', () => {
  it('stops applying color after an SGR 39 reset', () => {
    const spans = ansiToSpans('\x1b[31merror\x1b[39m normal') as React.ReactElement[];

    expect(spans).toHaveLength(2);
    expect(spans[0].props.style.color).toBeDefined();
    expect(spans[0].props.children).toBe('error');
    expect(spans[1].props.style.color).toBeUndefined();
    expect(spans[1].props.children).toBe(' normal');
  });
});

describe('StepLogsView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderView = ({
    status = ExecutionStatus.RUNNING,
    config,
    logsApi,
    output,
  }: {
    status?: ExecutionStatus;
    config: StepLogsConfig;
    logsApi: StepLogsApi;
    output?: unknown;
  }) => {
    const stepExecution = createMockStepExecutionDto({
      id: 'step-1',
      stepType: 'remoteHost.exec',
      status,
      output: output as never,
    });
    return render(<StepLogsView stepExecution={stepExecution} config={config} logsApi={logsApi} />);
  };

  it('loads default engine logs and stops after post-terminal retries', async () => {
    const fetchLogs = jest
      .fn()
      .mockResolvedValue([
        { id: '1', message: 'hello', timestamp: '2024-01-01T00:00:00Z', level: 'info' },
      ]);

    renderView({
      status: ExecutionStatus.COMPLETED,
      config: { enabled: true },
      logsApi: { fetchLogs },
    });

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
    });

    // Initial fetch + POST_TERMINAL_RETRIES (3)
    expect(fetchLogs).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    expect(fetchLogs.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fetchLogs.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('shows an error when the initial fetch fails for a completed step', async () => {
    const fetchLogs = jest.fn().mockRejectedValue(new Error('boom'));

    renderView({
      status: ExecutionStatus.COMPLETED,
      config: { enabled: true },
      logsApi: { fetchLogs },
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionStepLogsError')).toHaveTextContent(
        'Failed to load logs.'
      );
    });
  });

  it('keeps previous entries when a later poll fails', async () => {
    const fetchLogs = jest
      .fn()
      .mockResolvedValueOnce([
        { id: '1', message: 'first', timestamp: '2024-01-01T00:00:00Z', level: 'info' },
      ])
      .mockRejectedValueOnce(new Error('boom'));

    renderView({
      status: ExecutionStatus.RUNNING,
      config: { enabled: true },
      logsApi: { fetchLogs },
    });

    await waitFor(() => {
      expect(screen.getByText('first')).toBeInTheDocument();
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionStepLogsError')).toHaveTextContent(
        'Failed to refresh logs. Showing the last successful load.'
      );
    });
    expect(screen.getByText('first')).toBeInTheDocument();
  });

  it('sorts timestamped custom resolver results chronologically', async () => {
    const getLogs = jest.fn().mockResolvedValue([
      { message: 'second', timestamp: '2024-01-01T00:00:02Z' },
      { message: 'first', timestamp: '2024-01-01T00:00:01Z' },
    ] satisfies StepLogEntry[]);

    renderView({
      status: ExecutionStatus.COMPLETED,
      config: { enabled: true, getLogs },
      logsApi: { fetchLogs: jest.fn() },
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionStepLogsTerminal')).toBeInTheDocument();
    });

    const lines = screen.getByTestId('workflowExecutionStepLogsTerminal').querySelectorAll('div');
    expect(lines[0]).toHaveTextContent('first');
    expect(lines[1]).toHaveTextContent('second');
  });

  it('recomputes custom logs when terminal step output arrives', async () => {
    const getLogs = jest.fn(async ({ stepExecution }) => [
      {
        message: stepExecution.output
          ? `done:${(stepExecution.output as { result: string }).result}`
          : 'pending',
      },
    ]);

    const logsApi = { fetchLogs: jest.fn() };
    const config: StepLogsConfig = { enabled: true, getLogs };
    const { rerender } = render(
      <StepLogsView
        stepExecution={createMockStepExecutionDto({
          id: 'step-1',
          status: ExecutionStatus.COMPLETED,
          output: undefined,
        })}
        config={config}
        logsApi={logsApi}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    rerender(
      <StepLogsView
        stepExecution={createMockStepExecutionDto({
          id: 'step-1',
          status: ExecutionStatus.COMPLETED,
          output: { result: 'ok' },
        })}
        config={config}
        logsApi={logsApi}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('done:ok')).toBeInTheDocument();
    });
  });

  it('does not replace entries when a poll returns identical data', async () => {
    const entry = {
      id: '1',
      message: 'same',
      timestamp: '2024-01-01T00:00:00Z',
      level: 'info' as const,
    };
    const fetchLogs = jest.fn().mockResolvedValue([entry]);

    renderView({
      status: ExecutionStatus.RUNNING,
      config: { enabled: true },
      logsApi: { fetchLogs },
    });

    await waitFor(() => {
      expect(screen.getByText('same')).toBeInTheDocument();
    });

    const firstNode = screen.getByText('same');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });

    await waitFor(() => {
      expect(fetchLogs.mock.calls.length).toBeGreaterThan(1);
    });

    expect(screen.getByText('same')).toBe(firstNode);
  });
});
