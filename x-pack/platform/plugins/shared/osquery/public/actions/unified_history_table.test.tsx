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
import { useBulkGetUserProfiles } from './use_user_profiles';
import { usePacks } from '../packs/use_packs';
import type { UnifiedHistoryResponse } from '../../common/api/unified_history/types';
import {
  TestProviders,
  createMockLiveRow,
  createMockPackLiveRow,
  createMockRuleRow,
  createMockScheduledRow,
  defaultPermissions,
  noRunPermissions,
  resetMockCounter,
} from './__test_helpers__/mock_data';

const renderWithProviders = (element: React.ReactElement) =>
  render(element, { wrapper: TestProviders });

const mockPush = jest.fn();
const mockUseKibana = jest.fn();

jest.mock('../common/lib/kibana', () => ({
  ...jest.requireActual('../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush }),
}));

jest.mock('./use_unified_history');
jest.mock('./use_user_profiles');
jest.mock('../packs/use_packs');
jest.mock('../common/use_persisted_page_size', () => ({
  usePersistedPageSize: () => [10, jest.fn()],
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
}));

const useUnifiedHistoryMock = useUnifiedHistory as jest.MockedFunction<typeof useUnifiedHistory>;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.MockedFunction<
  typeof useBulkGetUserProfiles
>;
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

const mockPacks = (packs: Array<{ id: string; saved_object_id: string }> = []) => {
  usePacksMock.mockReturnValue({ data: { data: packs } } as never);
};

const mockProfiles = (profilesMap = new Map(), isLoading = false) => {
  useBulkGetUserProfilesMock.mockReturnValue({ profilesMap, isLoading });
};

const mockHistory = ({
  data = [],
  hasMore = false,
  nextPage,
  isLoading = false,
  isFetching = false,
}: {
  data?: UnifiedHistoryResponse['data'];
  hasMore?: boolean;
  nextPage?: string;
  isLoading?: boolean;
  isFetching?: boolean;
}) => {
  useUnifiedHistoryMock.mockReturnValue({
    data: { data, hasMore, nextPage },
    isLoading,
    isFetching,
    refetch: jest.fn(),
  } as never);
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
    const rows = [createMockLiveRow(), createMockLiveRow()];
    mockHistory({ data: rows });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('unifiedHistoryTable')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockHistory({ isLoading: true });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    expect(screen.queryByTestId('unifiedHistoryTable')).not.toBeInTheDocument();
  });

  it('renders all history columns', () => {
    mockHistory({ data: [createMockLiveRow()] });

    renderWithProviders(<UnifiedHistoryTable />);

    const columnHeaders = screen.getAllByRole('columnheader');
    const headerTexts = columnHeaders.map((h) => h.textContent);
    expect(headerTexts).toContain('Query');
    expect(headerTexts).toContain('Source');
    expect(headerTexts).toContain('Results');
    expect(headerTexts).toContain('Agents');
    expect(headerTexts).toContain('Created at');
    expect(headerTexts).toContain('Run by');
    expect(headerTexts).toContain('Actions');
  });

  it('renders HistoryFilters', () => {
    mockHistory({ data: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByTestId('history-search-input')).toBeInTheDocument();
  });

  it('calls useUnifiedHistory with expected parameters', () => {
    mockHistory({ data: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(useUnifiedHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 10,
        startDate: 'now-24h',
        endDate: 'now',
      })
    );
  });

  it('loads user profiles for live rows', () => {
    const rows = [createMockLiveRow()];
    mockHistory({ data: rows });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(useBulkGetUserProfilesMock).toHaveBeenCalledWith(rows);
  });

  it('agents column shows success/error badges when counts present', () => {
    const row = createMockLiveRow({ successCount: 4, errorCount: 1, agentCount: 5 });
    mockHistory({ data: [row] });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    const badges = container.querySelectorAll('.euiBadge');
    const badgeTexts = Array.from(badges).map((b) => b.textContent);
    expect(badgeTexts).toContain('4');
    expect(badgeTexts).toContain('1');
  });

  it('agents column falls back to agentCount when no success/error counts', () => {
    const row = createMockLiveRow({
      agentCount: 7,
      successCount: undefined,
      errorCount: undefined,
    });
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('results column shows totalRows for single query actions', () => {
    const row = createMockLiveRow({ totalRows: 42 });
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('results column shows X of Y for pack actions', () => {
    const row = createMockPackLiveRow({ queriesWithResults: 3, queriesTotal: 5 });
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText(/3 of 5/)).toBeInTheDocument();
  });

  it('results column shows em dash when no totalRows', () => {
    const row = createMockLiveRow({ totalRows: undefined, packName: undefined });
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('source column renders Live for live row', () => {
    const row = createMockLiveRow();
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('source column shows Rule for rule row', () => {
    const row = createMockRuleRow();
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('Rule')).toBeInTheDocument();
  });

  it('details button has correct href for navigation', () => {
    const row = createMockLiveRow({ actionId: 'action-42' });
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    const detailsButtons = screen.getAllByLabelText('Details');
    expect(detailsButtons[0].closest('a')).toHaveAttribute('href', '/history/action-42');
  });

  it('play button navigates to /new for single query', () => {
    const row = createMockLiveRow();
    mockHistory({ data: [row] });

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
    const row = createMockLiveRow();
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.queryAllByLabelText('Run query')).toHaveLength(0);
  });

  it('search submits on Enter key', async () => {
    mockHistory({ data: [] });

    renderWithProviders(<UnifiedHistoryTable />);

    const searchInput = screen.getByTestId('history-search-input');
    fireEvent.change(searchInput, { target: { value: 'test-search' } });

    expect(useUnifiedHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ kuery: undefined })
    );

    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(useUnifiedHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({ kuery: 'test-search' })
      );
    });
  });

  it('query column shows SQL for single query', () => {
    const row = createMockLiveRow({ queryText: 'SELECT * FROM uptime' });
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('SELECT * FROM uptime')).toBeInTheDocument();
  });

  it('query column shows pack name for pack query', () => {
    const row = createMockPackLiveRow();
    mockHistory({ data: [row] });

    renderWithProviders(<UnifiedHistoryTable />);

    expect(screen.getByText('My Pack')).toBeInTheDocument();
  });

  it('shows loading indicator on refetch', () => {
    mockHistory({ data: [createMockLiveRow()], isFetching: true });

    const { container } = renderWithProviders(<UnifiedHistoryTable />);

    expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();
  });

  describe('scheduled rows', () => {
    it('renders scheduled row in the table', () => {
      const rows = [createMockScheduledRow()];
      mockHistory({ data: rows });

      renderWithProviders(<UnifiedHistoryTable />);

      expect(screen.getByTestId('unifiedHistoryTable')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
    });

    it('source column shows Scheduled for scheduled row', () => {
      const row = createMockScheduledRow();
      mockHistory({ data: [row] });

      renderWithProviders(<UnifiedHistoryTable />);

      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });

    it('query column shows query name with pack badge for scheduled row', () => {
      const row = createMockScheduledRow({
        queryName: 'os_version_query',
        packName: 'Monitoring Pack',
        packId: 'pack-m1',
      });
      mockHistory({ data: [row] });

      renderWithProviders(<UnifiedHistoryTable />);

      expect(screen.getByText('os_version_query')).toBeInTheDocument();
      expect(screen.getByText('Monitoring Pack')).toBeInTheDocument();
    });

    it('results column shows totalRows for scheduled row', () => {
      const row = createMockScheduledRow({ totalRows: 20 });
      mockHistory({ data: [row] });

      renderWithProviders(<UnifiedHistoryTable />);

      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('run by column shows em dash for scheduled row', () => {
      const row = createMockScheduledRow();
      mockHistory({ data: [row] });

      renderWithProviders(<UnifiedHistoryTable />);

      const dashes = screen.getAllByText('\u2014');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('play button is not available for scheduled rows', () => {
      const row = createMockScheduledRow();
      mockHistory({ data: [row] });

      renderWithProviders(<UnifiedHistoryTable />);

      expect(screen.queryAllByLabelText('Run query')).toHaveLength(0);
    });

    it('details button navigates to scheduled execution route', () => {
      const row = createMockScheduledRow({
        scheduleId: 'sched-1',
        executionCount: 3,
      });
      mockHistory({ data: [row] });

      renderWithProviders(<UnifiedHistoryTable />);

      const detailsButtons = screen.getAllByLabelText('Details');
      expect(detailsButtons[0].closest('a')).toHaveAttribute(
        'href',
        '/history/scheduled/sched-1/3'
      );
    });

    it('renders mixed live and scheduled rows together', () => {
      const rows = [createMockLiveRow(), createMockScheduledRow(), createMockRuleRow()];
      mockHistory({ data: rows });

      renderWithProviders(<UnifiedHistoryTable />);

      expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('Rule')).toBeInTheDocument();
    });
  });
});
