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

jest.mock('../common/use_persisted_page_size', () => ({
  usePersistedPageSize: () => [20, jest.fn()],
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  RESULTS_PAGE_SIZE_STORAGE_KEY: 'osquery:resultsPageSize',
}));

jest.mock('../action_results/use_action_results');

jest.mock('./use_all_results');

jest.mock('./use_osquery_data_view');

jest.mock('./use_results_filtering');

jest.mock('@kbn/fleet-plugin/public', () => ({
  pagePathGetters: {
    agent_details: ({ agentId }: { agentId: string }) => ['', `/fleet/agents/${agentId}`],
  },
}));

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(),
}));

jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

jest.mock('./results_flyout', () => ({
  OsqueryResultsFlyout: () => null,
}));

jest.mock('./cell_renderers', () => ({
  getOsqueryCellRenderers: jest.fn().mockReturnValue({}),
}));

jest.mock('./transform_results', () => ({
  transformEdgesToRecords: jest.fn().mockReturnValue([]),
}));

const useActionResultsMock = useActionResults as jest.MockedFunction<typeof useActionResults>;
const useAllResultsMock = useAllResults as jest.MockedFunction<typeof useAllResults>;
const useOsqueryDataViewMock = useOsqueryDataView as jest.MockedFunction<typeof useOsqueryDataView>;
const useResultsFilteringMock = useResultsFiltering as jest.MockedFunction<
  typeof useResultsFiltering
>;

const mockDataView = {
  id: 'mock-data-view',
  title: 'logs-osquery_manager.results-*',
  getFieldByName: jest.fn().mockReturnValue(null),
  addRuntimeField: jest.fn(),
  toSpec: jest.fn().mockReturnValue({ fields: {} }),
  fields: { getByName: jest.fn() },
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
    handleQuerySubmit: jest.fn(),
    handleFiltersUpdated: jest.fn(),
    handleFilter: jest.fn(),
  } as never);
};

import { transformEdgesToRecords } from './transform_results';
const transformEdgesToRecordsMock = transformEdgesToRecords as jest.MockedFunction<
  typeof transformEdgesToRecords
>;

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
});
