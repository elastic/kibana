/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { UnifiedHistoryTable } from './unified_history_table';
import { useUnifiedHistory } from './use_unified_history';
import { useBulkGetUnifiedHistoryProfiles } from './use_user_profiles';
import { usePacks } from '../packs/use_packs';
import {
  TestProviders,
  defaultPermissions,
  noRunPermissions,
  resetMockCounter,
  createMockUnifiedHistoryRow,
  createMockPackUnifiedHistoryRow,
  createMockRuleHistoryRow,
  createMockScheduledHistoryRow,
} from './__test_helpers__/mock_data';
import type { UnifiedHistoryResponse } from '../../common/api/unified_history/types';

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

jest.mock('./use_unified_history');
jest.mock('./use_user_profiles');
jest.mock('../packs/use_packs');
jest.mock('../common/use_persisted_page_size', () => ({
  usePersistedPageSize: () => [20, jest.fn()],
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
}));

jest.mock('./components/history_filters', () => ({
  HistoryFilters: ({
    onFiltersChange,
    onRefresh,
  }: {
    onFiltersChange: jest.Mock;
    onRefresh: jest.Mock;
  }) => (
    <div data-test-subj="historyFilters">
      <input
        data-test-subj="unifiedHistorySearch"
        onChange={(e) =>
          onFiltersChange({
            kuery: e.target.value || undefined,
            selectedUserIds: [],
            sourceFilters: undefined,
            startDate: 'now-24h',
            endDate: 'now',
          })
        }
      />
      <button data-test-subj="refreshButton" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  ),
  DEFAULT_START_DATE: 'now-24h',
  DEFAULT_END_DATE: 'now',
}));

jest.mock('./use_history_users', () => ({
  useHistoryUsers: () => ({ userOptions: [], isLoading: false }),
}));

const useUnifiedHistoryMock = useUnifiedHistory as jest.MockedFunction<typeof useUnifiedHistory>;
const useBulkGetUnifiedHistoryProfilesMock =
  useBulkGetUnifiedHistoryProfiles as jest.MockedFunction<typeof useBulkGetUnifiedHistoryProfiles>;
const usePacksMock = usePacks as jest.MockedFunction<typeof usePacks>;

const mockKibana = (permissions = defaultPermissions) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: { capabilities: { osquery: permissions } },
      http: { post: jest.fn(), get: jest.fn() },
      notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      uiSettings: { get: jest.fn().mockReturnValue([]) },
    },
  });
};

const mockPacks = (packs: Array<{ id: string }> = []) => {
  usePacksMock.mockReturnValue({ data: { data: packs } } as never);
};

const mockProfiles = (profilesMap = new Map(), isLoading = false) => {
  useBulkGetUnifiedHistoryProfilesMock.mockReturnValue({ profilesMap, isLoading });
};

const mockUnifiedHistory = ({
  rows = [] as ReturnType<typeof createMockUnifiedHistoryRow>[],
  hasMore = false,
  isLoading = false,
  isFetching = false,
}: {
  rows?: ReturnType<typeof createMockUnifiedHistoryRow>[];
  hasMore?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
} = {}) => {
  const refetch = jest.fn();
  useUnifiedHistoryMock.mockReturnValue({
    data: {
      rows,
      hasMore,
      nextActionsCursor: hasMore ? rows[rows.length - 1]?.timestamp : undefined,
      nextScheduledCursor: undefined,
      nextScheduledOffset: undefined,
    } as UnifiedHistoryResponse,
    isLoading,
    isFetching,
    refetch,
  } as never);

  return { refetch };
};

describe('UnifiedHistoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockCounter();
    mockKibana();
    mockPacks();
    mockProfiles();
  });

  it('renders table with data', () => {
    const rows = [createMockUnifiedHistoryRow(), createMockUnifiedHistoryRow()];
    mockUnifiedHistory({ rows });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('unifiedHistoryTable')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockUnifiedHistory({ isLoading: true });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    expect(screen.queryByTestId('unifiedHistoryTable')).not.toBeInTheDocument();
  });

  it('renders all history columns', () => {
    mockUnifiedHistory({ rows: [createMockUnifiedHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getAllByText('Run by').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders HistoryFilters', () => {
    mockUnifiedHistory();

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('historyFilters')).toBeInTheDocument();
    expect(screen.getByTestId('unifiedHistorySearch')).toBeInTheDocument();
  });

  it('passes rows to useBulkGetUnifiedHistoryProfiles', () => {
    const rows = [createMockUnifiedHistoryRow()];
    mockUnifiedHistory({ rows });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(useBulkGetUnifiedHistoryProfilesMock).toHaveBeenCalledWith(rows);
  });

  it('agents column shows success/error breakdown', () => {
    const row = createMockUnifiedHistoryRow({ successCount: 4, errorCount: 1, agentCount: 5 });
    mockUnifiedHistory({ rows: [row] });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    const checkIcons = container.querySelectorAll('[data-euiicon-type="check"]');
    const crossIcons = container.querySelectorAll('[data-euiicon-type="cross"]');
    expect(checkIcons.length).toBeGreaterThanOrEqual(1);
    expect(crossIcons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('agents column falls back to count when no successCount', () => {
    const row = createMockUnifiedHistoryRow({
      successCount: undefined,
      errorCount: undefined,
      agentCount: 3,
    });
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('results column shows totalRows for single query actions', () => {
    const row = createMockUnifiedHistoryRow({ totalRows: 42 });
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('results column shows X of Y for pack actions', () => {
    const row = createMockPackUnifiedHistoryRow();
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText(/3 of 5/)).toBeInTheDocument();
  });

  it('results column shows em dash when no counts', () => {
    const row = createMockUnifiedHistoryRow({ totalRows: undefined });
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('source column renders Live badge', () => {
    mockUnifiedHistory({ rows: [createMockUnifiedHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('source column renders Rule badge', () => {
    mockUnifiedHistory({ rows: [createMockRuleHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Rule')).toBeInTheDocument();
  });

  it('source column renders Scheduled badge', () => {
    mockUnifiedHistory({ rows: [createMockScheduledHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('details button navigates to history path for live action', () => {
    const row = createMockUnifiedHistoryRow();
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(`history/${row.actionId}`);
  });

  it('details button navigates to scheduled history path', () => {
    const row = createMockScheduledHistoryRow();
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(mockUseRouterNavigate).toHaveBeenCalledWith(
      `history/scheduled/${row.scheduleId}/${row.executionCount}`
    );
  });

  it('play button navigates to /new for single query', () => {
    const row = createMockUnifiedHistoryRow();
    mockUnifiedHistory({ rows: [row] });

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

  it('play button navigates to /new with packId for pack query', () => {
    const row = createMockPackUnifiedHistoryRow();
    mockPacks([{ id: 'pack-1' }]);
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    const playButtons = screen.getAllByLabelText('Run query');
    playButtons[0].click();

    expect(mockPush).toHaveBeenCalledWith(
      '/new',
      expect.objectContaining({
        form: expect.objectContaining({
          packId: 'pack-1',
        }),
      })
    );
  });

  it('play button not available without permissions', () => {
    mockKibana(noRunPermissions);
    mockUnifiedHistory({ rows: [createMockUnifiedHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.queryAllByLabelText('Run query')).toHaveLength(0);
  });

  it('play button not available for scheduled rows', () => {
    mockUnifiedHistory({ rows: [createMockScheduledHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.queryAllByLabelText('Run query')).toHaveLength(0);
  });

  it('query column shows SQL code for single query', () => {
    mockUnifiedHistory({ rows: [createMockUnifiedHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('SELECT * FROM uptime')).toBeInTheDocument();
  });

  it('query column shows query name when available', () => {
    mockUnifiedHistory({
      rows: [createMockPackUnifiedHistoryRow({ queryName: 'uptime-query' })],
    });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('uptime-query')).toBeInTheDocument();
  });

  it('query column shows pack badge for scheduled pack queries', () => {
    mockUnifiedHistory({ rows: [createMockScheduledHistoryRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Compliance Pack')).toBeInTheDocument();
  });

  it('query column shows pack icon badge for live pack queries', () => {
    mockUnifiedHistory({ rows: [createMockPackUnifiedHistoryRow()] });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    const packageIcon = container.querySelector('[data-euiicon-type="package"]');
    expect(packageIcon).toBeInTheDocument();
  });

  it('shows loading indicator on refetch', () => {
    mockUnifiedHistory({
      rows: [createMockUnifiedHistoryRow()],
      isFetching: true,
    });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();
  });

  it('passes filter changes to useUnifiedHistory', () => {
    mockUnifiedHistory();

    renderWithProviders(<UnifiedHistoryTable />);

    const searchInput = screen.getByTestId('unifiedHistorySearch');
    fireEvent.change(searchInput, { target: { value: 'test-search' } });

    expect(useUnifiedHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ kuery: 'test-search' })
    );
  });

  it('calls refetch on refresh', async () => {
    const { refetch } = mockUnifiedHistory();

    renderWithProviders(<UnifiedHistoryTable />);

    fireEvent.click(screen.getByTestId('refreshButton'));

    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
  });

  it('renders pagination controls', () => {
    mockUnifiedHistory({ rows: [createMockUnifiedHistoryRow()], hasMore: true });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('unifiedHistoryPagination')).toBeInTheDocument();
  });

  it('shows row data-test-subj with row id', () => {
    const row = createMockUnifiedHistoryRow();
    mockUnifiedHistory({ rows: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId(`row-${row.id}`)).toBeInTheDocument();
  });
});
