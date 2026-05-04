/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { cleanup, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunningQuery } from '../../common/types';
import { QueryActivityApp } from './app';
import { useQueryActivityAppContext, type QueryActivityAppContextValue } from './app_context';
import { markStopRequestedTask } from '../lib/stop_requested_tasks_storage';
import { CANCELLATION_POLL_INTERVAL_MS } from '../../common/constants';

jest.mock('./app_context', () => ({
  __esModule: true,
  useQueryActivityAppContext: jest.fn(),
}));

const mockUseQueryActivityAppContext = useQueryActivityAppContext as jest.MockedFunction<
  typeof useQueryActivityAppContext
>;

const createQuery = (overrides: Partial<RunningQuery> = {}): RunningQuery => ({
  taskId: 'node1:123',
  queryType: 'DSL',
  source: 'Discover',
  startTime: Date.now() - 60_000,
  runningTimeMs: 60_000,
  indices: 1,
  query: '{"query":{"match_all":{}}}',
  cancellable: true,
  cancelled: false,
  ...overrides,
});

const mockContext = (
  overrides: Partial<QueryActivityAppContextValue> = {}
): QueryActivityAppContextValue =>
  ({
    chrome: {
      setBreadcrumbs: jest.fn(),
      docTitle: { change: jest.fn() },
    } as any,
    http: { basePath: { prepend: jest.fn((path: string) => path) } } as any,
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(),
      },
    } as any,
    apiService: {
      useLoadQueryActivity: jest.fn(),
      cancelTask: jest.fn(),
      fetchQueryActivity: jest.fn(),
    } as any,
    url: { locators: { get: jest.fn(() => undefined) } } as any,
    docLinks: {
      links: {
        management: {
          queryActivity: 'https://www.elastic.co/guide/en/kibana/current/query-activity.html',
        },
      },
    } as any,
    capabilities: {
      canCancelTasks: true,
      canViewTasks: true,
      isLoading: false,
      missingClusterPrivileges: [],
    },
    ...overrides,
  } as QueryActivityAppContextValue);

describe('QueryActivityApp - cancellation polling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not poll when there are no pending cancellations', async () => {
    const fetchQueryActivity = jest.fn().mockResolvedValue({ data: { queries: [] } });
    const resendRequest = jest.fn();
    const query = createQuery({ taskId: 'node1:no-poll' });

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [query] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn(),
        fetchQueryActivity,
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);
    renderWithKibanaRenderContext(<QueryActivityApp />);
    await screen.findByText(query.taskId);

    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS * 3);
    });

    expect(fetchQueryActivity).not.toHaveBeenCalled();
    expect(resendRequest).not.toHaveBeenCalled();
  });

  it('starts polling immediately on mount when localStorage has a pending cancellation', async () => {
    const taskId = 'node1:from-storage';
    markStopRequestedTask(taskId);

    const fetchQueryActivity = jest
      .fn()
      .mockResolvedValue({ data: { queries: [createQuery({ taskId })] } });

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [createQuery({ taskId })] },
          isLoading: false,
          error: null,
          resendRequest: jest.fn(),
        })),
        cancelTask: jest.fn(),
        fetchQueryActivity,
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);
    renderWithKibanaRenderContext(<QueryActivityApp />);
    await screen.findByText(taskId);

    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS);
    });

    expect(fetchQueryActivity).toHaveBeenCalledTimes(1);
  });

  it('polls repeatedly at the configured interval while cancellations are pending', async () => {
    const taskId = 'node1:repeat-poll';
    markStopRequestedTask(taskId);

    const fetchQueryActivity = jest
      .fn()
      .mockResolvedValue({ data: { queries: [createQuery({ taskId })] } });

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [createQuery({ taskId })] },
          isLoading: false,
          error: null,
          resendRequest: jest.fn(),
        })),
        cancelTask: jest.fn(),
        fetchQueryActivity,
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);
    renderWithKibanaRenderContext(<QueryActivityApp />);
    await screen.findByText(taskId);

    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS * 3);
    });

    expect(fetchQueryActivity).toHaveBeenCalledTimes(3);
  });

  it('calls resendRequest when a cancelled task disappears from the poll result', async () => {
    const taskId = 'node1:to-cancel';
    markStopRequestedTask(taskId);

    // Poll returns an empty list — the task is gone
    const fetchQueryActivity = jest.fn().mockResolvedValue({ data: { queries: [] } });
    const resendRequest = jest.fn();

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [createQuery({ taskId })] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn(),
        fetchQueryActivity,
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);
    renderWithKibanaRenderContext(<QueryActivityApp />);
    await screen.findByText(taskId);

    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS);
    });

    await waitFor(() => expect(resendRequest).toHaveBeenCalledTimes(1));
  });

  it('stops polling once all pending cancellations are confirmed gone', async () => {
    const taskId = 'node1:gone';
    markStopRequestedTask(taskId);

    // Task is gone from the very first poll
    const fetchQueryActivity = jest.fn().mockResolvedValue({ data: { queries: [] } });
    const resendRequest = jest.fn();

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [createQuery({ taskId })] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn(),
        fetchQueryActivity,
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);
    renderWithKibanaRenderContext(<QueryActivityApp />);
    await screen.findByText(taskId);

    // First tick — task confirmed gone, pendingCancellations becomes empty
    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS);
    });

    await waitFor(() => expect(resendRequest).toHaveBeenCalledTimes(1));
    expect(fetchQueryActivity).toHaveBeenCalledTimes(1);

    // Subsequent ticks — no more polling since pendingCancellations is now empty
    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS * 3);
    });

    expect(fetchQueryActivity).toHaveBeenCalledTimes(1);
  });

  it('starts polling after the user successfully cancels a query', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const taskId = 'node1:cancel-starts-poll';

    const fetchQueryActivity = jest
      .fn()
      .mockResolvedValue({ data: { queries: [createQuery({ taskId })] } });

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [createQuery({ taskId })] },
          isLoading: false,
          error: null,
          resendRequest: jest.fn(),
        })),
        cancelTask: jest.fn().mockResolvedValue({ error: undefined }),
        fetchQueryActivity,
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);
    renderWithKibanaRenderContext(<QueryActivityApp />);

    await user.click(await screen.findByLabelText('Cancel query'));
    await user.click(await screen.findByRole('button', { name: 'Cancel the query' }));

    await waitFor(() => {
      expect(context.notifications.toasts.addSuccess).toHaveBeenCalled();
    });

    // Before any interval elapses, polling has not fired yet
    const callsBeforeInterval = fetchQueryActivity.mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(CANCELLATION_POLL_INTERVAL_MS);
    });

    // After one interval, polling should have fired at least once
    expect(fetchQueryActivity.mock.calls.length).toBeGreaterThan(callsBeforeInterval);
  });
});
