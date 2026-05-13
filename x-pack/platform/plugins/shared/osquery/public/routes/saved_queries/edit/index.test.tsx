/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { EditSavedQueryPage } from '.';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ savedQueryId: 'test-saved-query-id' }),
}));

jest.mock('../../../common/hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

const mockUseKibana = jest.fn();
const mockUseRouterNavigate = jest.fn();

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
  useRouterNavigate: (path: string) => {
    mockUseRouterNavigate(path);

    return { onClick: jest.fn(), href: path };
  },
}));

const mockUseIsExperimentalFeatureEnabled = jest.fn().mockReturnValue(true);

jest.mock('../../../common/experimental_features_context', () => ({
  ...jest.requireActual('../../../common/experimental_features_context'),
  useIsExperimentalFeatureEnabled: (feature: string) =>
    mockUseIsExperimentalFeatureEnabled(feature),
}));

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../saved_queries', () => ({
  useSavedQuery: jest.fn(() => ({
    isLoading: false,
    data: {
      id: 'test-saved-query-id',
      saved_object_id: 'test-saved-query-id',
      description: '',
      query: 'SELECT * FROM uptime',
      prebuilt: false,
    },
    error: null,
  })),
  useDeleteSavedQuery: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useUpdateSavedQuery: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock('../../../saved_queries/use_copy_saved_query', () => ({
  useCopySavedQuery: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isLoading: false,
  })),
}));

jest.mock('./form', () => ({
  EditSavedQueryForm: (props: { onDirtyStateChange?: (isDirty: boolean) => void }) => (
    <div data-test-subj="edit-saved-query-form">
      <button data-test-subj="make-form-dirty" onClick={() => props.onDirtyStateChange?.(true)}>
        Make form dirty
      </button>
      <button data-test-subj="make-form-clean" onClick={() => props.onDirtyStateChange?.(false)}>
        Make form clean
      </button>
    </div>
  ),
}));

jest.mock('../../../components/layouts', () => ({
  WithHeaderLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="with-header-layout">{children}</div>
  ),
  fullWidthFormContentCss: {},
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

const renderComponent = () =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <EditSavedQueryPage />
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

const setupKibana = (overrides: Record<string, unknown> = {}) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          osquery: {
            writeSavedQueries: true,
            readSavedQueries: true,
            writeLiveQueries: true,
            runSavedQueries: true,
            ...overrides,
          },
        },
      },
      notifications: {
        toasts: { addSuccess: jest.fn(), addError: jest.fn() },
      },
      http: { post: jest.fn(), get: jest.fn() },
    },
  });
};

describe('EditSavedQueryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    setupKibana();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  describe('Duplicate query button', () => {
    it('renders the Duplicate query button when queryHistoryRework is enabled and user has writeSavedQueries', () => {
      renderComponent();
      expect(screen.getByText('Duplicate query')).toBeInTheDocument();
    });

    it('does not render the Duplicate query button when queryHistoryRework is disabled', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
      renderComponent();
      expect(screen.queryByText('Duplicate query')).not.toBeInTheDocument();
    });

    it('does not render the Duplicate query button when user lacks writeSavedQueries', () => {
      setupKibana({ writeSavedQueries: false });
      renderComponent();
      expect(screen.queryByText('Duplicate query')).not.toBeInTheDocument();
    });
  });

  describe('when form is dirty and user clicks Duplicate query', () => {
    it('shows the confirmation modal instead of calling mutateAsync directly', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('make-form-dirty'));

      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('modal contains Cancel and Duplicate buttons', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('make-form-dirty'));
      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument();
    });
  });

  describe('when form is clean and user clicks Duplicate query', () => {
    it('calls mutateAsync immediately without showing a modal', async () => {
      renderComponent();

      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('calls mutateAsync immediately after form becomes clean again', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('make-form-dirty'));
      fireEvent.click(screen.getByTestId('make-form-clean'));

      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('confirmation modal — Cancel button', () => {
    it('closes the modal without calling mutateAsync when Cancel is clicked', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('make-form-dirty'));
      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('confirmation modal — Duplicate button', () => {
    it('calls mutateAsync and closes the modal when Duplicate is clicked', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('make-form-dirty'));
      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      });
    });

    it('modal can be reopened after being confirmed', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('make-form-dirty'));
      fireEvent.click(screen.getByText('Duplicate query'));
      fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

      await waitFor(() => {
        expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('make-form-dirty'));
      fireEvent.click(screen.getByText('Duplicate query'));

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });
  });
});
