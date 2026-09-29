/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { EditSavedQueryForm } from './form';

vi.mock('../../../common/lib/kibana', async () => {
      const mocked = {
      ...(await vi.importActual('../../../common/lib/kibana')),
      useKibana: () => ({
        services: {
          application: {
            capabilities: {
              osquery: {
                writeSavedQueries: true,
                readSavedQueries: true,
                writeLiveQueries: true,
                runSavedQueries: true,
              },
            },
          },
          notifications: { toasts: { addSuccess: vi.fn(), addError: vi.fn() } },
          http: { get: vi.fn(), post: vi.fn() },
        },
      }),
      useRouterNavigate: (path: string) => ({ onClick: vi.fn(), href: path }),
    };
      return { ...mocked, default: mocked };
    });

const mockIdSet = new Set<string>();
const mockSerializer = vi.fn((data: unknown) => data);
const mockHandleSubmit = vi.fn((callback: (data: unknown) => void) => (e?: any) => {
  e?.preventDefault?.();
  callback({
    id: 'test-query',
    query: 'SELECT * FROM uptime',
    description: 'Test description',
    ecs_mapping: {},
  });
});
const mockFormState = { isSubmitting: false, isDirty: false };

vi.mock('../../../saved_queries/form/use_saved_query_form', () => {
      const mocked = {
      useSavedQueryForm: vi.fn(() => ({
        serializer: mockSerializer,
        idSet: mockIdSet,
        handleSubmit: mockHandleSubmit,
        formState: mockFormState,
        register: vi.fn(),
        unregister: vi.fn(),
        watch: vi.fn(),
        setValue: vi.fn(),
        getValues: vi.fn(),
        getFieldState: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        resetField: vi.fn(),
        reset: vi.fn(),
        trigger: vi.fn(),
        control: {},
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../saved_queries/form', () => {
      const mocked = {
      SavedQueryForm: ({
        viewMode,
        hasPlayground,
      }: {
        viewMode?: boolean;
        hasPlayground?: boolean;
      }) => (
        <div data-test-subj="saved-query-form">
          <span data-test-subj="view-mode">{String(!!viewMode)}</span>
          <span data-test-subj="has-playground">{String(!!hasPlayground)}</span>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderComponent = (props: Partial<React.ComponentProps<typeof EditSavedQueryForm>> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <EditSavedQueryForm handleSubmit={vi.fn()} {...props} />
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

describe('EditSavedQueryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormState.isSubmitting = false;
    mockFormState.isDirty = false;
  });

  describe('form rendering', () => {
    it('should render the saved query form', () => {
      renderComponent();
      expect(screen.getByTestId('saved-query-form')).toBeInTheDocument();
    });

    it('should pass hasPlayground=true to SavedQueryForm', () => {
      renderComponent();
      expect(screen.getByTestId('has-playground')).toHaveTextContent('true');
    });

    it('should pass viewMode=false by default', () => {
      renderComponent();
      expect(screen.getByTestId('view-mode')).toHaveTextContent('false');
    });

    it('should pass viewMode=true when specified', () => {
      renderComponent({ viewMode: true });
      expect(screen.getByTestId('view-mode')).toHaveTextContent('true');
    });
  });

  describe('bottom bar', () => {
    it('should render Cancel and Update query buttons when not in view mode', () => {
      renderComponent();

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Update query')).toBeInTheDocument();
    });

    it('should not render bottom bar in view mode', () => {
      renderComponent({ viewMode: true });

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Update query')).not.toBeInTheDocument();
    });
  });

  describe('update button', () => {
    it('should call handleSubmit when Update query is clicked', () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      renderComponent({ handleSubmit });

      fireEvent.click(screen.getByTestId('update-query-button'));

      expect(mockSerializer).toHaveBeenCalled();
    });
  });

  describe('dirty state tracking', () => {
    it('should call onDirtyStateChange when form becomes dirty', () => {
      const onDirtyStateChange = vi.fn();
      mockFormState.isDirty = true;

      renderComponent({ onDirtyStateChange });

      expect(onDirtyStateChange).toHaveBeenCalledWith(true);
    });

    it('should call onDirtyStateChange with false when form is clean', () => {
      const onDirtyStateChange = vi.fn();
      mockFormState.isDirty = false;

      renderComponent({ onDirtyStateChange });

      expect(onDirtyStateChange).toHaveBeenCalledWith(false);
    });
  });
});
