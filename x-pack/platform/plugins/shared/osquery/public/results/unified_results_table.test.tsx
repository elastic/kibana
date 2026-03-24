/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { UnifiedResultsTable } from './unified_results_table';
import { useActionResults } from '../action_results/use_action_results';
import { useAllResults } from './use_all_results';
import { useOsqueryDataView } from './use_osquery_data_view';
import { useResultsFiltering } from './use_results_filtering';

// ---- Mock: useKibana ----
const mockSearchBar = jest.fn((_props: unknown) => null);

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      appName: 'osquery',
      application: {
        getUrlForApp: jest.fn().mockReturnValue('/fleet/agents/agent-1'),
        capabilities: { osquery: { read: true, write: true, runSavedQueries: true } },
      },
      theme: { theme$: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) } },
      uiSettings: { get: jest.fn().mockReturnValue(false) },
      notifications: {
        toasts: { addWarning: jest.fn(), addSuccess: jest.fn(), addError: jest.fn() },
      },
      data: {
        fieldFormats: {},
        dataViews: { create: jest.fn().mockResolvedValue({}) },
      },
      analytics: {},
      i18n: {},
      uiActions: { getTriggerCompatibleActions: jest.fn().mockResolvedValue([]) },
      unifiedSearch: {
        ui: {
          SearchBar: (props: unknown) => mockSearchBar(props),
        },
      },
      chrome: {},
    },
  }),
}));

// ---- Mock: usePersistedPageSize ----
jest.mock('../common/use_persisted_page_size', () => ({
  usePersistedPageSize: () => [20, jest.fn()],
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  RESULTS_PAGE_SIZE_STORAGE_KEY: 'osquery:resultsPageSize',
}));

// ---- Mock: useActionResults ----
jest.mock('../action_results/use_action_results');

// ---- Mock: useAllResults ----
jest.mock('./use_all_results');

// ---- Mock: useOsqueryDataView ----
jest.mock('./use_osquery_data_view');

// ---- Mock: useResultsFiltering ----
jest.mock('./use_results_filtering');

// ---- Mock: @kbn/fleet-plugin/public ----
jest.mock('@kbn/fleet-plugin/public', () => ({
  pagePathGetters: {
    agent_details: ({ agentId }: { agentId: string }) => ['', `/fleet/agents/${agentId}`],
  },
}));

// ---- Mock: @kbn/react-kibana-mount ----
jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(),
}));

// ---- Mock: CellActionsProvider (passthrough wrapper) ----
jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---- Mock: UnifiedDataTable — captures onInitialStateChange so tests can invoke it ----
let capturedOnInitialStateChange: ((state: Partial<{ isCompareActive: boolean }>) => void) | null =
  null;

jest.mock('@kbn/unified-data-table', () => ({
  UnifiedDataTable: (props: {
    onInitialStateChange?: (state: Partial<{ isCompareActive: boolean }>) => void;
  }) => {
    capturedOnInitialStateChange = props.onInitialStateChange ?? null;

    return <div data-test-subj="mockUnifiedDataTable" />;
  },
  DataLoadingState: { loading: 'loading', loaded: 'loaded' },
  DataGridDensity: { EXPANDED: 'expanded', COMPACT: 'compact' },
}));

// ---- Mock: OsqueryResultsFlyout ----
jest.mock('./results_flyout', () => ({
  OsqueryResultsFlyout: () => null,
}));

// ---- Mock: cell_renderers ----
jest.mock('./cell_renderers', () => ({
  getOsqueryCellRenderers: jest.fn().mockReturnValue({}),
}));

// ---- Mock: transform_results ----
jest.mock('./transform_results', () => ({
  transformEdgesToRecords: jest.fn().mockReturnValue([]),
}));

// ---- Typed mock references ----
const useActionResultsMock = useActionResults as jest.MockedFunction<typeof useActionResults>;
const useAllResultsMock = useAllResults as jest.MockedFunction<typeof useAllResults>;
const useOsqueryDataViewMock = useOsqueryDataView as jest.MockedFunction<typeof useOsqueryDataView>;
const useResultsFilteringMock = useResultsFiltering as jest.MockedFunction<
  typeof useResultsFiltering
>;

// ---- Minimal mock data view ----
const mockDataView = {
  id: 'mock-data-view',
  title: 'logs-osquery_manager.results-*',
  getFieldByName: jest.fn().mockReturnValue(null),
  addRuntimeField: jest.fn(),
  toSpec: jest.fn().mockReturnValue({ fields: {} }),
  fields: { getByName: jest.fn() },
} as unknown as ReturnType<typeof useOsqueryDataView>['dataView'];

// ---- Helper: configure all required mocks with sensible defaults ----
const setupMocks = ({
  rows = [],
  total = 0,
}: {
  rows?: unknown[];
  total?: number;
} = {}) => {
  // Reset the captured callback before each render so stale refs don't leak between tests
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
    handleQuerySubmit: jest.fn(),
    handleFiltersUpdated: jest.fn(),
    handleFilter: jest.fn(),
  } as never);
};

// ---- Import transformEdgesToRecords so tests can override its return value ----
import { transformEdgesToRecords } from './transform_results';
const transformEdgesToRecordsMock = transformEdgesToRecords as jest.MockedFunction<
  typeof transformEdgesToRecords
>;

// ---- Default props ----
const defaultProps = {
  actionId: 'test-action-id',
  agentIds: ['agent-1'],
};

describe('UnifiedResultsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnInitialStateChange = null;
    transformEdgesToRecordsMock.mockReturnValue([]);
  });

  describe('EuiTablePagination visibility', () => {
    it('should show pagination when results are present and comparison mode is inactive', () => {
      // Arrange: mock results with rows so pagination renders
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 50 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 50, columns: [] },
        isLoading: false,
      } as never);

      // Act
      render(<UnifiedResultsTable {...defaultProps} />);

      // Assert: EuiTablePagination is rendered (comparison mode defaults to false).
      // EuiTablePagination renders a <nav> via EuiPagination — match by its page button.
      expect(screen.getByTestId('pagination-button-0')).toBeInTheDocument();
    });

    it('should hide pagination when comparison mode is active', () => {
      // Arrange: mock results with rows
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 50 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 50, columns: [] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      // Act: simulate UnifiedDataTable firing onInitialStateChange with isCompareActive = true
      act(() => {
        capturedOnInitialStateChange?.({ isCompareActive: true });
      });

      // Assert: pagination is no longer rendered
      expect(screen.queryByTestId('pagination-button-0')).not.toBeInTheDocument();
    });

    it('should show pagination again after exiting comparison mode', () => {
      // Arrange: mock results with rows
      const mockRows = [{ id: 'row-1', raw: {}, flattened: {} }] as never;
      transformEdgesToRecordsMock.mockReturnValue(mockRows);
      setupMocks({ rows: [{}], total: 50 });
      useAllResultsMock.mockReturnValue({
        data: { edges: [{}], total: 50, columns: [] },
        isLoading: false,
      } as never);

      render(<UnifiedResultsTable {...defaultProps} />);

      // Activate comparison mode
      act(() => {
        capturedOnInitialStateChange?.({ isCompareActive: true });
      });

      // Confirm it is hidden
      expect(screen.queryByTestId('pagination-button-0')).not.toBeInTheDocument();

      // Deactivate comparison mode
      act(() => {
        capturedOnInitialStateChange?.({ isCompareActive: false });
      });

      // Assert: pagination is visible again
      expect(screen.getByTestId('pagination-button-0')).toBeInTheDocument();
    });
  });
});
