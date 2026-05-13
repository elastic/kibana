/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { EditSavedQueryForm } from './form';

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
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
      notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      http: { get: jest.fn(), post: jest.fn() },
    },
  }),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
}));

const mockIdSet = new Set<string>();
const mockSerializer = jest.fn((data: unknown) => data);
const mockHandleSubmit = jest.fn((callback: (data: unknown) => void) => (e?: any) => {
  e?.preventDefault?.();
  callback({
    id: 'test-query',
    query: 'SELECT * FROM uptime',
    description: 'Test description',
    ecs_mapping: {},
  });
});
const mockFormState = { isSubmitting: false, isDirty: false };

jest.mock('../../../saved_queries/form/use_saved_query_form', () => ({
  useSavedQueryForm: jest.fn(() => ({
    serializer: mockSerializer,
    idSet: mockIdSet,
    handleSubmit: mockHandleSubmit,
    formState: mockFormState,
    register: jest.fn(),
    unregister: jest.fn(),
    watch: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(),
    getFieldState: jest.fn(),
    setError: jest.fn(),
    clearErrors: jest.fn(),
    resetField: jest.fn(),
    reset: jest.fn(),
    trigger: jest.fn(),
    control: {},
  })),
  savedQueryDataSerializer: jest.fn((data: unknown) => data),
}));

jest.mock('../../../saved_queries/form', () => ({
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
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderComponent = (props: Partial<React.ComponentProps<typeof EditSavedQueryForm>> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <EditSavedQueryForm handleSubmit={jest.fn()} {...props} />
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

describe('EditSavedQueryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      renderComponent({ handleSubmit });

      fireEvent.click(screen.getByTestId('update-query-button'));

      expect(mockSerializer).toHaveBeenCalled();
    });
  });

  describe('dirty state tracking', () => {
    it('should call onDirtyStateChange when form becomes dirty', () => {
      const onDirtyStateChange = jest.fn();
      mockFormState.isDirty = true;

      renderComponent({ onDirtyStateChange });

      expect(onDirtyStateChange).toHaveBeenCalledWith(true);
    });

    it('should call onDirtyStateChange with false when form is clean', () => {
      const onDirtyStateChange = jest.fn();
      mockFormState.isDirty = false;

      renderComponent({ onDirtyStateChange });

      expect(onDirtyStateChange).toHaveBeenCalledWith(false);
    });
  });
});
