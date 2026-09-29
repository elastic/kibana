/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { EditSavedQueryPage } from '.';
import {
  OsqueryPageHeaderProvider,
  useOsqueryPageHeaderTitle,
} from '../../../components/osquery_page_header_context';
import { useSavedQuery } from '../../../saved_queries';

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: () => ({ savedQueryId: 'test-saved-query-id' }),
  };

  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_breadcrumbs', () => {
  const mocked = {
    useBreadcrumbs: vi.fn(),
  };

  return { ...mocked, default: mocked };
});

const mockUseKibana = vi.fn();
const mockUseRouterNavigate = vi.fn();

vi.mock('../../../common/lib/kibana', async () => {
  const mocked = {
    ...(await vi.importActual('../../../common/lib/kibana')),
    useKibana: () => mockUseKibana(),
    useRouterNavigate: (path: string) => {
      mockUseRouterNavigate(path);

      return { onClick: vi.fn(), href: path };
    },
  };

  return { ...mocked, default: mocked };
});

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../saved_queries', () => {
  const mocked = {
    useSavedQuery: vi.fn(() => ({
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
    useDeleteSavedQuery: vi.fn(() => ({ mutateAsync: vi.fn() })),
    useUpdateSavedQuery: vi.fn(() => ({ mutateAsync: vi.fn() })),
  };

  return { ...mocked, default: mocked };
});

vi.mock('../../../saved_queries/use_copy_saved_query', () => {
  const mocked = {
    useCopySavedQuery: vi.fn(() => ({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    })),
  };

  return { ...mocked, default: mocked };
});

vi.mock('./form', () => {
  const mocked = {
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
  };

  return { ...mocked, default: mocked };
});

vi.mock('../../../components/layouts', () => {
  const mocked = {
    fullWidthFormContentCss: {},
  };

  return { ...mocked, default: mocked };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

const PublishedTitle = () => {
  const title = useOsqueryPageHeaderTitle();

  return <span data-test-subj="published-osquery-title">{title ?? ''}</span>;
};

const renderComponent = () =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <OsqueryPageHeaderProvider>
            <EditSavedQueryPage />
            <PublishedTitle />
          </OsqueryPageHeaderProvider>
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
        toasts: { addSuccess: vi.fn(), addError: vi.fn() },
      },
      http: { post: vi.fn(), get: vi.fn() },
    },
  });
};

describe('EditSavedQueryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupKibana();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  describe('Duplicate query button', () => {
    it('renders the Duplicate query button when user has writeSavedQueries', () => {
      renderComponent();
      expect(screen.getByText('Duplicate query')).toBeInTheDocument();
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

  describe('page chrome', () => {
    it('publishes a fallback header title when the saved query fails to load', () => {
      (useSavedQuery as Mock).mockReturnValue({
        isLoading: false,
        data: undefined,
        error: new Error('nope'),
      });
      renderComponent();

      expect(screen.getByText('Failed to load saved query')).toBeInTheDocument();
      expect(screen.getByTestId('published-osquery-title')).toHaveTextContent('Edit saved query');
    });
  });
});
