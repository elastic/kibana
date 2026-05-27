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
import { QueryActivityApp } from './app';
import { useQueryActivityAppContext, type QueryActivityAppContextValue } from './app_context';

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

const mockContext = (overrides: Partial<QueryActivityAppContextValue> = {}) =>
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

describe('QueryActivityApp', () => {
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

    mockUseQueryActivityAppContext.mockReturnValue(context);

    renderWithKibanaRenderContext(<QueryActivityApp />);

    expect(await screen.findByText('Contact your administrator for access')).toBeInTheDocument();
    expect(screen.getByText(/Missing Elasticsearch cluster privilege/)).toBeInTheDocument();
  });

  it('renders the table when the user can view tasks and data is available', async () => {
    const query = createQuery({ taskId: 'node1:render' });
    const resendRequest = jest.fn();

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [query] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn(),
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);

    renderWithKibanaRenderContext(<QueryActivityApp />);

    expect(await screen.findByText(query.taskId)).toBeInTheDocument();
  });

  it('shows a success toast and refreshes when stopping a query succeeds', async () => {
    const user = userEvent.setup();
    const query = createQuery({ taskId: 'node1:stop-app' });
    const resendRequest = jest.fn();

    const context = mockContext({
      apiService: {
        useLoadQueryActivity: jest.fn(() => ({
          data: { queries: [query] },
          isLoading: false,
          error: null,
          resendRequest,
        })),
        cancelTask: jest.fn().mockResolvedValue({ error: undefined }),
      } as any,
    });

    mockUseQueryActivityAppContext.mockReturnValue(context);

    renderWithKibanaRenderContext(<QueryActivityApp />);

    await user.click(await screen.findByLabelText('Cancel query'));
    await user.click(await screen.findByRole('button', { name: 'Cancel the query' }));

    await waitFor(() => {
      expect(context.notifications.toasts.addSuccess).toHaveBeenCalled();
    });
    expect(resendRequest).toHaveBeenCalled();
  });
});
