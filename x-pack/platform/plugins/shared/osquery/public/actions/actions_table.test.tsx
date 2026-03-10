/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ActionsTable } from './actions_table';
import { useAllLiveQueries } from './use_all_live_queries';
import { usePacks } from '../packs/use_packs';
import {
  TestProviders,
  createMockSearchHit,
  createMockPackSearchHit,
  defaultPermissions,
  noRunPermissions,
  resetMockCounter,
} from './__test_helpers__/mock_data';

const renderWithProviders = (element: React.ReactElement) =>
  render(element, { wrapper: TestProviders });

const mockPush = jest.fn();
const mockUseRouterNavigate = jest.fn();
const mockUseKibana = jest.fn();

jest.mock('../common/lib/kibana', () => ({
  ...jest.requireActual('../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => {
    mockUseRouterNavigate(path);

    return { onClick: jest.fn(), href: path };
  },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush }),
}));

jest.mock('./use_all_live_queries');
jest.mock('../packs/use_packs');
jest.mock('../common/use_persisted_page_size', () => ({
  usePersistedPageSize: () => [20, jest.fn()],
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
}));

const useAllLiveQueriesMock = useAllLiveQueries as jest.MockedFunction<typeof useAllLiveQueries>;
const usePacksMock = usePacks as jest.MockedFunction<typeof usePacks>;

const mockKibana = (permissions = defaultPermissions) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: { capabilities: { osquery: permissions } },
      http: { post: jest.fn(), get: jest.fn() },
      notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
    },
  });
};

const mockPacks = (packs: Array<{ id: string }> = []) => {
  usePacksMock.mockReturnValue({ data: { data: packs } } as never);
};

const mockActions = ({
  items = [],
  total = items.length,
  isLoading = false,
  isFetching = false,
}: {
  items?: any[];
  total?: number;
  isLoading?: boolean;
  isFetching?: boolean;
}) => {
  useAllLiveQueriesMock.mockReturnValue({
    data: { data: { items, total } },
    isLoading,
    isFetching,
  } as never);
};

describe('ActionsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockCounter();
    mockKibana();
    mockPacks();
  });

  it('renders table with data', () => {
    const items = [createMockSearchHit(), createMockSearchHit()];
    mockActions({ items });

    renderWithProviders(<ActionsTable />);

    expect(screen.getByTestId('liveQueryActionsTable')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(items.length + 1);
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockActions({ isLoading: true });

    const { container } = renderWithProviders(<ActionsTable />);

    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    expect(screen.queryByTestId('liveQueryActionsTable')).not.toBeInTheDocument();
  });

  it('shows loading indicator on refetch', () => {
    mockActions({ items: [createMockSearchHit()], isFetching: true });

    const { container } = renderWithProviders(<ActionsTable />);

    expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();
  });

  it('renders basic columns only (no Source, no Results)', () => {
    mockActions({ items: [createMockSearchHit()] });

    renderWithProviders(<ActionsTable />);

    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Created at')).toBeInTheDocument();
    expect(screen.getByText('Run by')).toBeInTheDocument();
    expect(screen.getByText('View details')).toBeInTheDocument();
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
    expect(screen.queryByText('Results')).not.toBeInTheDocument();
  });

  it('agents column shows simple count', () => {
    const hit = createMockSearchHit({
      fields: {
        action_id: ['a1'],
        agents: ['agent-1', 'agent-2', 'agent-3'],
        user_id: ['elastic'],
        '@timestamp': ['2025-06-15T10:00:00.000Z'],
      },
    });
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('run by column shows plain text user ID', () => {
    const hit = createMockSearchHit({
      fields: {
        action_id: ['a1'],
        agents: ['agent-1'],
        user_id: ['some_user'],
        '@timestamp': ['2025-06-15T10:00:00.000Z'],
      },
    });
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    expect(screen.getByText('some_user')).toBeInTheDocument();
  });

  it('query column shows SQL for single query', () => {
    const hit = createMockSearchHit();
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    expect(screen.getByText('SELECT * FROM uptime')).toBeInTheDocument();
  });

  it('query column shows pack name for pack query', () => {
    const hit = createMockPackSearchHit();
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    expect(screen.getByText('My Pack')).toBeInTheDocument();
  });

  it('details button navigates to live_queries path', () => {
    const hit = createMockSearchHit();
    const actionId = (hit.fields as Record<string, string[]>).action_id[0];
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(`live_queries/${actionId}`);
  });

  it('play button navigates to live_queries/new for single query', () => {
    const hit = createMockSearchHit();
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    const playButtons = screen.getAllByLabelText('Run query');
    playButtons[0].click();

    expect(mockPush).toHaveBeenCalledWith(
      '/live_queries/new',
      expect.objectContaining({
        form: expect.objectContaining({
          query: 'SELECT * FROM uptime',
        }),
      })
    );
  });

  it('play button disabled without write or run permissions', () => {
    mockKibana(noRunPermissions);
    const hit = createMockSearchHit();
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    const playButtons = screen.queryAllByLabelText('Run query');
    expect(playButtons).toHaveLength(0);
  });

  it('no filter UI rendered', () => {
    mockActions({ items: [createMockSearchHit()] });

    renderWithProviders(<ActionsTable />);

    expect(screen.queryByTestId('history-search-input')).not.toBeInTheDocument();
  });

  it('passes hardcoded kuery to useAllLiveQueries', () => {
    mockActions({ items: [] });

    renderWithProviders(<ActionsTable />);

    expect(useAllLiveQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'user_id: *' })
    );
  });

  it('does not pass withResultCounts to useAllLiveQueries', () => {
    mockActions({ items: [] });

    renderWithProviders(<ActionsTable />);

    const callArgs = useAllLiveQueriesMock.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('withResultCounts');
  });

  it('play button navigates to live_queries/new for pack query', () => {
    const hit = createMockPackSearchHit();
    mockPacks([{ id: 'pack-1' }]);
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    const playButtons = screen.getAllByLabelText('Run query');
    playButtons[0].click();

    expect(mockPush).toHaveBeenCalledWith(
      '/live_queries/new',
      expect.objectContaining({
        form: expect.objectContaining({
          packId: 'pack-1',
        }),
      })
    );
  });

  it('truncates long SQL queries at 90 characters', () => {
    const longQuery =
      'SELECT very_long_column_name, another_column, yet_another FROM some_table WHERE condition = 1 AND more_stuff';
    const hit = createMockSearchHit({
      _source: {
        queries: [{ query: longQuery, action_id: 'a1', id: 'q1' }],
        agent_ids: ['agent-1'],
      },
    });
    mockActions({ items: [hit] });

    renderWithProviders(<ActionsTable />);

    const truncated = `${longQuery.substring(0, 90)}...`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });
});
