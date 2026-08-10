/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { SavedQueriesTable } from './saved_queries_table';
import type { SavedQuerySO } from '.';
import type { OsqueryCapabilities } from '../../../__test_helpers__/create_mock_kibana_services';
import { ROLE_CAPABILITIES } from '../../../__test_helpers__/create_mock_kibana_services';

const mockUseKibana = jest.fn();
const mockUseRouterNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush }),
}));

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => {
    mockUseRouterNavigate(path);

    return { onClick: jest.fn(), href: path };
  },
}));

jest.mock('../../../common/hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('../../../common/use_persisted_page_size', () => ({
  usePersistedPageSize: jest.fn(() => [20, jest.fn()]),
  PAGE_SIZE_OPTIONS: [10, 20, 50],
}));

const mockUseSavedQueryUsers = jest.fn(() => ({
  users: [],
  profilesMap: new Map(),
  isLoading: false,
}));

jest.mock('../../../common/use_saved_object_users', () => ({
  useSavedQueryUsers: () => mockUseSavedQueryUsers(),
}));

jest.mock('../../../saved_queries/use_copy_saved_query', () => ({
  useCopySavedQuery: () => ({ mutateAsync: jest.fn(), isLoading: false }),
}));

jest.mock('../../../saved_queries/use_delete_saved_query', () => ({
  useDeleteSavedQuery: () => ({ mutateAsync: jest.fn(), isLoading: false }),
}));

jest.mock('../../../components/table_toolbar', () => ({
  TableToolbar: (props: any) => <div data-test-subj="table-toolbar">{props.actionButton}</div>,
}));

jest.mock('../../../actions/components/run_by_column', () => ({
  RunByColumn: ({ userId }: { userId?: string }) => (
    <span data-test-subj="run-by-column">{userId ?? 'unknown'}</span>
  ),
}));

const mockUseSavedQueries = jest.fn();

jest.mock('../../../saved_queries/use_saved_queries', () => ({
  useSavedQueries: (...args: unknown[]) => mockUseSavedQueries(...args),
}));

const createSavedQuery = (overrides: Partial<SavedQuerySO> = {}): SavedQuerySO => ({
  id: 'test-query-1',
  name: 'test-query-1',
  saved_object_id: 'so-1',
  query: 'SELECT * FROM uptime',
  description: 'Test description',
  ecs_mapping: {},
  updated_at: '2025-06-15T10:00:00.000Z',
  created_by: 'elastic',
  ...overrides,
});

const setupKibana = (capabilities: Partial<OsqueryCapabilities> = {}) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          osquery: { ...ROLE_CAPABILITIES.admin, ...capabilities },
        },
      },
    },
  });
};

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderComponent = () =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <SavedQueriesTable />
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

describe('SavedQueriesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
    mockUseSavedQueries.mockReturnValue({
      data: {
        data: [
          createSavedQuery({ id: 'query-alpha', saved_object_id: 'so-1' }),
          createSavedQuery({
            id: 'query-beta',
            saved_object_id: 'so-2',
            description: 'Beta description',
          }),
        ],
        total: 2,
      },
      isLoading: false,
      isFetching: false,
    });
  });

  describe('columns', () => {
    it('should render all expected columns', () => {
      renderComponent();

      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Query ID')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Created by')).toBeInTheDocument();
      expect(screen.getByText('Last updated at')).toBeInTheDocument();
    });

    it('should render query IDs in the table', () => {
      renderComponent();

      expect(screen.getByText('query-alpha')).toBeInTheDocument();
      expect(screen.getByText('query-beta')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show skeleton loading when data is loading', () => {
      mockUseSavedQueries.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      });

      const { container } = renderComponent();
      // EuiSkeletonText renders span elements with the class for loading
      expect(container.querySelector('.euiSkeletonText')).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should render the table with data when available', () => {
      mockUseSavedQueries.mockReturnValue({
        data: {
          data: Array.from({ length: 5 }, (_, i) =>
            createSavedQuery({ id: `query-${i}`, saved_object_id: `so-${i}` })
          ),
          total: 25,
        },
        isLoading: false,
        isFetching: false,
      });

      renderComponent();

      // Table renders all rows on the current page
      expect(screen.getByText('query-0')).toBeInTheDocument();
      expect(screen.getByText('query-4')).toBeInTheDocument();
    });
  });

  describe('permissions', () => {
    it('should render run button as disabled when user lacks runSavedQueries', () => {
      setupKibana({ runSavedQueries: false });

      renderComponent();

      const runButtons = screen.getAllByLabelText(/Run query/);
      runButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('should render run button as enabled when user has runSavedQueries', () => {
      renderComponent();

      const runButtons = screen.getAllByLabelText(/Run query/);
      runButtons.forEach((btn) => {
        expect(btn).not.toBeDisabled();
      });
    });

    it('should disable Create query button when user lacks writeSavedQueries', () => {
      setupKibana({ writeSavedQueries: false });

      renderComponent();

      expect(screen.getByText('Create query').closest('a, button')).toBeDisabled();
    });

    it('should enable Create query button when user has writeSavedQueries', () => {
      renderComponent();

      expect(screen.getByText('Create query').closest('a, button')).not.toBeDisabled();
    });
  });

  describe('sorting', () => {
    it('should render sortable Query ID column', () => {
      renderComponent();

      // The column header should be a button (sortable)
      const table = screen.getByRole('table');
      const queryIdHeader = within(table).getByText('Query ID');
      expect(queryIdHeader.closest('button')).toBeInTheDocument();
    });
  });
});
