/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { UnifiedResultsTable } from './unified_results_table';
import { useActionResults } from '../action_results/use_action_results';
import { useAllResults } from './use_all_results';
import { useOsqueryDataView } from './use_osquery_data_view';
import { useResultsFiltering } from './use_results_filtering';

const mockSearchBar = vi.fn((_props: unknown) => null);

vi.mock('../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          appName: 'osquery',
          application: {
            getUrlForApp: vi.fn().mockReturnValue('/fleet/agents/agent-1'),
            capabilities: { osquery: { read: true, write: true, runSavedQueries: true } },
          },
          theme: { theme$: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) } },
          uiSettings: { get: vi.fn().mockReturnValue(false) },
          notifications: {
            toasts: { addWarning: vi.fn(), addSuccess: vi.fn(), addError: vi.fn() },
          },
          data: {
            fieldFormats: {},
            dataViews: { create: vi.fn().mockResolvedValue({}) },
          },
          analytics: {},
          i18n: {},
          uiActions: { getTriggerCompatibleActions: vi.fn().mockResolvedValue([]) },
          unifiedSearch: {
            ui: {
              SearchBar: (props: unknown) => mockSearchBar(props),
            },
          },
          chrome: {},
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../common/use_persisted_page_size', () => {
      const mocked = {
      usePersistedPageSize: () => [20, vi.fn()],
      PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
      RESULTS_PAGE_SIZE_STORAGE_KEY: 'osquery:resultsPageSize',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../action_results/use_action_results');

vi.mock('./use_all_results');

vi.mock('./use_osquery_data_view');

vi.mock('./use_results_filtering');

vi.mock('@kbn/fleet-plugin/public', () => {
      const mocked = {
      pagePathGetters: {
        agent_details: ({ agentId }: { agentId: string }) => ['', `/fleet/agents/${agentId}`],
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/react-kibana-mount', () => {
      const mocked = {
      toMountPoint: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cell-actions', () => {
      const mocked = {
      CellActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

const mockSetFilters = vi.fn();
const mockClearFilters = vi.fn();

vi.mock('./export_filters_context', () => {
      const mocked = {
      useExportFiltersContext: () => ({
        getFilters: vi.fn(),
        setFilters: mockSetFilters,
        clearFilters: mockClearFilters,
        subscribe: vi.fn(() => () => undefined),
      }),
    };
      return { ...mocked, default: mocked };
    });

let capturedOnInitialStateChange: ((state: Partial<{ isCompareActive: boolean }>) => void) | null =
  null;

vi.mock('./results_flyout', () => {
      const mocked = {
      OsqueryResultsFlyout: () => null,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./cell_renderers', () => {
      const mocked = {
      getOsqueryCellRenderers: vi.fn().mockReturnValue({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./transform_results', () => {
      const mocked = {
      transformEdgesToRecords: vi.fn().mockReturnValue([]),
    };
      return { ...mocked, default: mocked };
    });

const useActionResultsMock = useActionResults as MockedFunction<typeof useActionResults>;
const useAllResultsMock = useAllResults as MockedFunction<typeof useAllResults>;
const useOsqueryDataViewMock = useOsqueryDataView as MockedFunction<typeof useOsqueryDataView>;
const useResultsFilteringMock = useResultsFiltering as MockedFunction<
  typeof useResultsFiltering
>;

const mockDataView = {
  id: 'mock-data-view',
  title: 'logs-osquery_manager.results-*',
  getFieldByName: vi.fn().mockReturnValue(null),
  addRuntimeField: vi.fn(),
  toSpec: vi.fn().mockReturnValue({ fields: {} }),
  fields: { getByName: vi.fn() },
} as unknown as ReturnType<typeof useOsqueryDataView>['dataView'];

const setupMocks = ({
  rows = [],
  total = 0,
}: {
  rows?: unknown[];
  total?: number;
} = {}) => {
  capturedOnInitialStateChange = null;

  useActionResultsMock.mockReturnValue({
    data: {
      aggregations: { totalResponded: 1, totalRowCount: total },
    },
  } as never);

  useAllResultsMock.mockReturnValue({
    data: {
      edges: rows,
      total,
      columns: [],
    },
    isLoading: false,
  } as never);

  useOsqueryDataViewMock.mockReturnValue({
    dataView: mockDataView,
    isLoading: false,
  } as never);

  useResultsFilteringMock.mockReturnValue({
    query: { query: '', language: 'kuery' },
    filters: [],
    userKuery: '',
    activeFilters: [],
    filtersForSuggestions: [],
    handleQuerySubmit: vi.fn(),
    handleFiltersUpdated: vi.fn(),
    handleFilter: vi.fn(),
  } as never);
};

import { transformEdgesToRecords } from './transform_results';
const transformEdgesToRecordsMock = transformEdgesToRecords as MockedFunction<
  typeof transformEdgesToRecords
>;

const defaultProps = {
  actionId: 'test-action-id',
  agentIds: ['agent-1'],
};

let capturedUnifiedDataTableProps: Record<string, unknown> = {};

// Mock that also captures props for assertions
vi.mock('@kbn/unified-data-table', () => {
      const mocked = {
      UnifiedDataTable: (props: Record<string, unknown>) => {
        capturedUnifiedDataTableProps = props;
        capturedOnInitialStateChange =
          (
            props as {
              onInitialStateChange?: (state: Partial<{ isCompareActive: boolean }>) => void;
            }
          ).onInitialStateChange ?? null;

        return <div data-test-subj="mockUnifiedDataTable" />;
      },
      DataLoadingState: { loading: 'loading', loaded: 'loaded' },
      DataGridDensity: { EXPANDED: 'expanded', COMPACT: 'compact' },
    };
      return { ...mocked, default: mocked };
    });

describe('UnifiedResultsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnInitialStateChange = null;
    capturedUnifiedDataTableProps = {};
    transformEdgesToRecordsMock.mockReturnValue([]);
  });

  describe('EuiTablePagination visibility', () => {
    it('should show pagination when results are present and comparison mode is inactive', () => {
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 50 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 50, columns: [] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(screen.getByTestId('pagination-button-0')).toBeInTheDocument();
    });

    it('should hide pagination when comparison mode is active', () => {
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 50 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 50, columns: [] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      act(() => {
        capturedOnInitialStateChange?.({ isCompareActive: true });
      });

      expect(screen.queryByTestId('pagination-button-0')).not.toBeInTheDocument();
    });

    it('should show pagination again after exiting comparison mode', () => {
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 50 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 50, columns: [] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      act(() => {
        capturedOnInitialStateChange?.({ isCompareActive: true });
      });

      expect(screen.queryByTestId('pagination-button-0')).not.toBeInTheDocument();

      act(() => {
        capturedOnInitialStateChange?.({ isCompareActive: false });
      });

      expect(screen.getByTestId('pagination-button-0')).toBeInTheDocument();
    });
  });

  describe('ECS-mapped column visibility', () => {
    it('should pass visible columns derived from result data to UnifiedDataTable', () => {
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 1 });
      useAllResultsMock.mockReturnValue({
        data: {
          edges: [{}],
          total: 1,
          columns: ['osquery.days.number', 'osquery.hostname', 'agent.id'],
        },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      // UnifiedDataTable should receive columns prop
      expect(capturedUnifiedDataTableProps).toHaveProperty('columns');
      const columns = capturedUnifiedDataTableProps.columns as string[];
      expect(columns).toContain('osquery.days.number');
      expect(columns).toContain('osquery.hostname');
    });

    it('should render the UnifiedDataTable component', () => {
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 1 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 1, columns: ['osquery.uptime'] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(screen.getByTestId('mockUnifiedDataTable')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render results panel when no results', () => {
      setupMocks({ rows: [], total: 0 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [], total: 0, columns: [] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(screen.getAllByTestId('osqueryResultsPanel').length).toBeGreaterThan(0);
    });
  });

  describe('export filters publishing', () => {
    // `useActionResults` seeds React Query with
    // `initialData.aggregations.totalRowCount = 0`, so the publisher must rely
    // on `isFetched && !isError` to distinguish "loaded, zero rows" from the
    // initial-loading and error states. See the comment in
    // `unified_results_table.tsx` next to `unfilteredTotal`.
    const initialDataAggregations = { totalResponded: 0, totalRowCount: 0 };

    it('keeps total undefined while the initial fetch is still in flight', () => {
      setupMocks({ rows: [], total: 0 });
      useActionResultsMock.mockReturnValue({
        data: { aggregations: initialDataAggregations },
        isFetched: false,
        isError: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(mockSetFilters).toHaveBeenLastCalledWith(
        'test-action-id',
        expect.objectContaining({ total: undefined })
      );
    });

    it('keeps total undefined when the initial fetch errored, even though `isFetched` is true', () => {
      setupMocks({ rows: [], total: 0 });
      useActionResultsMock.mockReturnValue({
        data: { aggregations: initialDataAggregations },
        isFetched: true,
        isError: true,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(mockSetFilters).toHaveBeenLastCalledWith(
        'test-action-id',
        expect.objectContaining({ total: undefined })
      );
    });

    it('publishes total: 0 only when the fetch confirms zero rows', () => {
      setupMocks({ rows: [], total: 0 });
      useActionResultsMock.mockReturnValue({
        data: { aggregations: { totalResponded: 1, totalRowCount: 0 } },
        isFetched: true,
        isError: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(mockSetFilters).toHaveBeenLastCalledWith(
        'test-action-id',
        expect.objectContaining({ total: 0 })
      );
    });

    it('publishes the actual row count when the fetch succeeds with results', () => {
      setupMocks({ rows: [], total: 7 });
      useActionResultsMock.mockReturnValue({
        data: { aggregations: { totalResponded: 1, totalRowCount: 7 } },
        isFetched: true,
        isError: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      expect(mockSetFilters).toHaveBeenLastCalledWith(
        'test-action-id',
        expect.objectContaining({ total: 7 })
      );
    });

    it('does NOT call clearFilters when the component unmounts (tab-switch-style unmount)', () => {
      setupMocks({ rows: [], total: 5 });
      useActionResultsMock.mockReturnValue({
        data: { aggregations: { totalResponded: 1, totalRowCount: 5 } },
        isFetched: true,
        isError: false,
      } as never);

      const { unmount } = render(<UnifiedResultsTable {...defaultProps} />);

      mockClearFilters.mockClear();
      unmount();

      expect(mockClearFilters).not.toHaveBeenCalled();
    });
  });
});
