/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import { UnifiedHistoryTable } from './unified_history_table';
import { useAllLiveQueries } from './use_all_live_queries';
import { useBulkGetUserProfiles } from './use_user_profiles';
import { usePacks } from '../packs/use_packs';
import * as buildHistoryKueryModule from './utils/build_history_kuery';
import {
  TestProviders,
  createMockSearchHit,
  createMockSearchHitWithResultCounts,
  createMockPackSearchHitWithResultCounts,
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
jest.mock('./use_user_profiles');
jest.mock('../packs/use_packs');
jest.mock('../common/use_persisted_page_size', () => ({
  usePersistedPageSize: () => [20, jest.fn()],
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
}));

const useAllLiveQueriesMock = useAllLiveQueries as jest.MockedFunction<typeof useAllLiveQueries>;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.MockedFunction<
  typeof useBulkGetUserProfiles
>;
const usePacksMock = usePacks as jest.MockedFunction<typeof usePacks>;

const buildHistoryKuerySpy = jest.spyOn(buildHistoryKueryModule, 'buildHistoryKuery');

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

const mockProfiles = (profilesMap = new Map(), isLoading = false) => {
  useBulkGetUserProfilesMock.mockReturnValue({ profilesMap, isLoading });
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

describe('UnifiedHistoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockCounter();
    mockKibana();
    mockPacks();
    mockProfiles();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders table with data', () => {
    const items = [createMockSearchHitWithResultCounts(), createMockSearchHitWithResultCounts()];
    mockActions({ items });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('liveQueryActionsTable')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(items.length + 1);
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockActions({ isLoading: true });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    expect(screen.queryByTestId('liveQueryActionsTable')).not.toBeInTheDocument();
  });

  it('renders all history columns', () => {
    mockActions({ items: [createMockSearchHitWithResultCounts()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Created at')).toBeInTheDocument();
    expect(screen.getAllByText('Run by').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('View details')).toBeInTheDocument();
  });

  it('renders HistoryFilters', () => {
    mockActions({ items: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('history-search-input')).toBeInTheDocument();
  });

  it('fetches data with withResultCounts', () => {
    mockActions({ items: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(useAllLiveQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ withResultCounts: true })
    );
  });

  it('loads user profiles', () => {
    const items = [createMockSearchHitWithResultCounts()];
    mockActions({ items });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(useBulkGetUserProfilesMock).toHaveBeenCalledWith(items);
  });

  it('agents column shows success/error breakdown when result_counts present', () => {
    const hit = createMockSearchHitWithResultCounts({
      _source: {
        result_counts: {
          total_rows: 10,
          responded_agents: 5,
          successful_agents: 4,
          error_agents: 1,
        },
      },
    });
    mockActions({ items: [hit] });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    const agentsCellContent = container.querySelector(
      '[data-test-subj="tableHeaderCell_agents_3"]'
    );
    expect(agentsCellContent).toBeInTheDocument();

    const checkIcons = container.querySelectorAll('[data-euiicon-type="check"]');
    const crossIcons = container.querySelectorAll('[data-euiicon-type="cross"]');
    expect(checkIcons.length).toBeGreaterThanOrEqual(1);
    expect(crossIcons.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('agents column falls back to count when no result_counts', () => {
    const hit = createMockSearchHit({
      fields: {
        action_id: ['a1'],
        agents: ['agent-1', 'agent-2', 'agent-3'],
        user_id: ['elastic'],
        '@timestamp': ['2025-06-15T10:00:00.000Z'],
      },
    });
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('results column shows total_rows for single query actions', () => {
    const hit = createMockSearchHitWithResultCounts();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('results column shows X of Y for pack actions', () => {
    const hit = createMockPackSearchHitWithResultCounts();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText(/3 of 5/)).toBeInTheDocument();
  });

  it('results column shows em dash when no counts', () => {
    const hit = createMockSearchHit();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('source column renders for each row', () => {
    const hit = createMockSearchHit({
      fields: {
        action_id: ['a1'],
        agents: ['agent-1'],
        user_id: ['some_user'],
        '@timestamp': ['2025-06-15T10:00:00.000Z'],
      },
    });
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('source column shows Rule when no userId', () => {
    const hit = createMockSearchHit({
      fields: {
        action_id: ['a1'],
        agents: ['agent-1'],
        user_id: undefined,
        '@timestamp': ['2025-06-15T10:00:00.000Z'],
      },
    });
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Rule')).toBeInTheDocument();
  });

  it('details button navigates to history path', () => {
    const hit = createMockSearchHitWithResultCounts();
    const actionId = (hit.fields as Record<string, string[]>).action_id[0];
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(`history/${actionId}`);
  });

  it('play button navigates to /new for single query', () => {
    const hit = createMockSearchHitWithResultCounts();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    const playButtons = screen.getAllByLabelText('Run query');
    playButtons[0].click();

    expect(mockPush).toHaveBeenCalledWith(
      '/new',
      expect.objectContaining({
        form: expect.objectContaining({
          query: 'SELECT * FROM uptime',
        }),
      })
    );
  });

  it('play button not available without permissions', () => {
    mockKibana(noRunPermissions);
    const hit = createMockSearchHitWithResultCounts();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.queryAllByLabelText('Run query')).toHaveLength(0);
  });

  it('search debounces at 400ms', async () => {
    mockActions({ items: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    const searchInput = screen.getByTestId('history-search-input');
    fireEvent.change(searchInput, { target: { value: 'test-search' } });

    expect(buildHistoryKuerySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerm: '' })
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(buildHistoryKuerySpy).toHaveBeenCalledWith(
        expect.objectContaining({ searchTerm: 'test-search' })
      );
    });
  });

  it('kuery uses buildHistoryKuery', () => {
    mockActions({ items: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(buildHistoryKuerySpy).toHaveBeenCalledWith({
      searchTerm: '',
      selectedUserIds: [],
    });
  });

  it('query column shows SQL for single query', () => {
    const hit = createMockSearchHitWithResultCounts();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('SELECT * FROM uptime')).toBeInTheDocument();
  });

  it('query column shows pack name for pack query', () => {
    const hit = createMockPackSearchHitWithResultCounts();
    mockActions({ items: [hit] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('My Pack')).toBeInTheDocument();
  });

  it('shows loading indicator on refetch', () => {
    mockActions({ items: [createMockSearchHitWithResultCounts()], isFetching: true });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();
  });
});
