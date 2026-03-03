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
import type { RunningQuery } from '../../../common/types';
import { RunningQueriesTable } from './running_queries_table';
import { useRunningQueriesAppContext, type RunningQueriesAppContextValue } from '../app_context';

jest.mock('../app_context', () => ({
  __esModule: true,
  useRunningQueriesAppContext: jest.fn(),
}));

const mockUseRunningQueriesAppContext = useRunningQueriesAppContext as jest.MockedFunction<
  typeof useRunningQueriesAppContext
>;

const STOP_REQUESTED_STORAGE_KEY = 'xpack.runningQueries.stopRequestedTasks';

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
    chrome: {} as any,
    http: {} as any,
    notifications: {} as any,
    apiService: {} as any,
    url: {
      locators: {
        get: jest.fn(() => undefined),
      },
    } as any,
    capabilities: {
      canCancelTasks: true,
      canViewTasks: true,
      isLoading: false,
      missingClusterPrivileges: [],
    },
    ...overrides,
  } as RunningQueriesAppContextValue);

const renderTable = async (params: {
  queries: RunningQuery[];
  canCancelTasks?: boolean;
  onCancelQuery?: (taskId: string) => Promise<boolean>;
  contextOverrides?: Partial<RunningQueriesAppContextValue>;
}) => {
  const user = userEvent.setup();

  const { queries, canCancelTasks = true } = params;
  const onCancelQuery = params.onCancelQuery ?? jest.fn().mockResolvedValue(true);

  mockUseRunningQueriesAppContext.mockReturnValue(
    mockContext({
      capabilities: {
        canCancelTasks,
        canViewTasks: true,
        isLoading: false,
        missingClusterPrivileges: [],
      },
      ...params.contextOverrides,
    })
  );

  renderWithKibanaRenderContext(
    <RunningQueriesTable queries={queries} onCancelQuery={onCancelQuery} />
  );

  return { user, onCancelQuery };
};

describe('RunningQueriesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders the "Not available" label when source is empty', async () => {
    const query = createQuery({ source: '' });
    await renderTable({ queries: [query] });

    expect(await screen.findByText(query.taskId)).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('shows the stop action only when the user can cancel tasks and the query is cancellable', async () => {
    const query = createQuery({ cancellable: true, cancelled: false });

    await renderTable({ queries: [query], canCancelTasks: true });
    expect(await screen.findByLabelText('Stop query')).toBeInTheDocument();

    cleanup();
    await renderTable({ queries: [query], canCancelTasks: false });
    expect(screen.queryByLabelText('Stop query')).not.toBeInTheDocument();

    cleanup();
    await renderTable({ queries: [createQuery({ cancellable: false })], canCancelTasks: true });
    expect(screen.queryByLabelText('Stop query')).not.toBeInTheDocument();

    cleanup();
    await renderTable({ queries: [createQuery({ cancelled: true })], canCancelTasks: true });
    expect(screen.queryByLabelText('Stop query')).not.toBeInTheDocument();
  });

  it('opens the query detail flyout when clicking the task id', async () => {
    const query = createQuery({ taskId: 'node1:flyout' });
    const { user } = await renderTable({ queries: [query] });

    await user.click(await screen.findByText(query.taskId));

    expect(await screen.findByText('Indices')).toBeInTheDocument();
  });

  it('stops a query after confirmation and shows the "Stopping the query…" state', async () => {
    const query = createQuery({ taskId: 'node1:stop' });
    const onCancelQuery = jest.fn().mockResolvedValue(true);
    const { user } = await renderTable({ queries: [query], onCancelQuery });

    await user.click(await screen.findByLabelText('Stop query'));
    expect(
      await screen.findByText('Are you sure you want to stop this query?')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(onCancelQuery).toHaveBeenCalledWith(query.taskId);
    });

    expect(await screen.findByText(/Stopping the query/)).toBeInTheDocument();
  });

  it('renders the "Stopping the query…" state when localStorage is pre-seeded', async () => {
    const query = createQuery({ taskId: 'node1:seeded' });
    window.localStorage.setItem(
      STOP_REQUESTED_STORAGE_KEY,
      JSON.stringify({ [query.taskId]: Date.now() })
    );

    await renderTable({ queries: [query], canCancelTasks: true });

    expect(await screen.findByText(/Stopping the query/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Stop query')).not.toBeInTheDocument();
  });
});
