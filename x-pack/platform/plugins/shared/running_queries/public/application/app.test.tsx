/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunningQuery } from '../../common/types';
import { RunningQueriesApp } from './app';
import { useRunningQueriesAppContext, type RunningQueriesAppContextValue } from './app_context';

jest.mock('./app_context', () => ({
  __esModule: true,
  useRunningQueriesAppContext: jest.fn(),
}));

const mockUseRunningQueriesAppContext = useRunningQueriesAppContext as jest.MockedFunction<
  typeof useRunningQueriesAppContext
>;

const createQuery = (overrides: Partial<RunningQuery> = {}): RunningQuery => ({
  taskId: 'node1:123',
  queryType: 'DSL',
  source: 'Discover',
  startTime: Date.now() - 60_000,
  indices: 1,
  query: '{"query":{"match_all":{}}}',
  cancellable: true,
  cancelled: false,
  ...overrides,
});

const mockContext = (overrides: Partial<RunningQueriesAppContextValue> = {}) =>
  ({
    chrome: {
      setBreadcrumbs: jest.fn(),
      docTitle: { change: jest.fn() },
    } as any,
    http: {} as any,
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(),
      },
    } as any,
    apiService: {
      useLoadRunningQueries: jest.fn(),
      cancelTask: jest.fn(),
    } as any,
    url: { locators: { get: jest.fn(() => undefined) } } as any,
    capabilities: {
      canCancelTasks: true,
      canViewTasks: true,
      isLoading: false,
      missingClusterPrivileges: [],
    },
    ...overrides,
  } as RunningQueriesAppContextValue);

describe('RunningQueriesApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a no-access prompt when the user cannot view tasks', async () => {
    const context = mockContext({
      capabilities: {
        canCancelTasks: false,
        canViewTasks: false,
        isLoading: false,
        missingClusterPrivileges: ['monitor'],
      },
    });

    mockUseRunningQueriesAppContext.mockReturnValue(context);

    renderWithKibanaRenderContext(<RunningQueriesApp />);

    expect(await screen.findByText('Contact your administrator for access')).toBeInTheDocument();
    expect(screen.getByText(/Missing Elasticsearch cluster privilege/)).toBeInTheDocument();
  });

  it('renders the table when the user can view tasks and data is available', async () => {
    const query = createQuery({ taskId: 'node1:render' });
    const resendRequest = jest.fn();

    const context = mockContext({
      apiService: {
        useLoadRunningQueries: jest.fn(() => ({
          data: { queries: [query] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn(),
      } as any,
    });

    mockUseRunningQueriesAppContext.mockReturnValue(context);

    renderWithKibanaRenderContext(<RunningQueriesApp />);

    expect(await screen.findByText(query.taskId)).toBeInTheDocument();
  });

  it('shows a success toast and refreshes when stopping a query succeeds', async () => {
    const user = userEvent.setup();
    const query = createQuery({ taskId: 'node1:stop-app' });
    const resendRequest = jest.fn();

    const context = mockContext({
      apiService: {
        useLoadRunningQueries: jest.fn(() => ({
          data: { queries: [query] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn().mockResolvedValue({ error: undefined }),
      } as any,
    });

    mockUseRunningQueriesAppContext.mockReturnValue(context);

    renderWithKibanaRenderContext(<RunningQueriesApp />);

    await user.click(await screen.findByLabelText('Stop query'));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(context.notifications.toasts.addSuccess).toHaveBeenCalled();
    });
    expect(resendRequest).toHaveBeenCalled();
  });
});
