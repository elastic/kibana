/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CreateDataStreamFlyout } from './create_data_stream_flyout';
import { UIStateProvider } from '../../contexts';
import { IntegrationFormProvider } from '../../forms/integration_form';
import {
  useFetchIndices,
  useValidateIndex,
  useGetIntegrationById,
  useCreateUpdateIntegration,
} from '../../../../common';

jest.mock('../../../../common', () => ({
  useFetchIndices: jest.fn(),
  useValidateIndex: jest.fn(),
  useGetIntegrationById: jest.fn(),
  useCreateUpdateIntegration: jest.fn(),
  useUploadSamples: jest.fn(() => ({
    uploadSamplesMutation: {
      mutateAsync: jest.fn(),
      isLoading: false,
    },
    isLoading: false,
  })),
  generateId: jest.fn(() => 'mock-id'),
  useKibana: jest.fn(() => ({
    services: {
      http: {},
      notifications: { toasts: { addError: jest.fn() } },
    },
  })),
}));
jest.mock('../../../../common/lib/api', () => ({
  getInstalledPackages: jest.fn(() =>
    Promise.resolve({
      items: [],
    })
  ),
}));

const mockUseFetchIndices = useFetchIndices as jest.Mock;
const mockUseValidateIndex = useValidateIndex as jest.Mock;
const mockUseGetIntegrationById = useGetIntegrationById as jest.Mock;
const mockUseCreateUpdateIntegration = useCreateUpdateIntegration as jest.Mock;

const mockServices = coreMock.createStart();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/create']}>
            <Route path={['/edit/:integrationId', '/create']}>
              <UIStateProvider>
                <IntegrationFormProvider onSubmit={jest.fn()}>{children}</IntegrationFormProvider>
              </UIStateProvider>
            </Route>
          </MemoryRouter>
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

describe('CreateDataStreamFlyout', () => {
  const mockOnClose = jest.fn();
  const mockValidateIndex = jest.fn();
  const mockClearValidationError = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFetchIndices.mockReturnValue({
      indices: ['logs-test', 'metrics-test', 'events-test'],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseValidateIndex.mockReturnValue({
      isValidating: false,
      validationError: null,
      validateIndex: mockValidateIndex.mockResolvedValue(true),
      clearValidationError: mockClearValidationError,
    });

    mockUseGetIntegrationById.mockReturnValue({
      integration: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseCreateUpdateIntegration.mockReturnValue({
      createUpdateIntegrationMutation: {
        mutateAsync: mockMutateAsync.mockResolvedValue({ integration_id: 'new-id' }),
        isLoading: false,
      },
      isLoading: false,
      error: null,
    });
  });

  describe('rendering', () => {
    it('should render the flyout with form fields', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('createDataStreamFlyout')).toBeInTheDocument();
      });

      expect(getByTestId('dataStreamTitleInput')).toBeInTheDocument();
      expect(getByTestId('dataStreamDescriptionInput')).toBeInTheDocument();
      expect(getByTestId('dataCollectionMethodSelect')).toBeInTheDocument();
      expect(getByTestId('logsSourceUploadCard')).toBeInTheDocument();
      expect(getByTestId('logsSourceIndexCard')).toBeInTheDocument();
    });

    it('should render cancel and analyze buttons', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('cancelDataStreamButton')).toBeInTheDocument();
        expect(getByTestId('analyzeLogsButton')).toBeInTheDocument();
      });
    });
  });

  describe('cancel button', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('cancelDataStreamButton')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('cancelDataStreamButton'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyze button state', () => {
    it('should have analyze button disabled when form is empty', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('analyzeLogsButton')).toBeInTheDocument();
      });

      expect(getByTestId('analyzeLogsButton')).toBeDisabled();
    });
  });

  describe('log source selection', () => {
    it('should have upload option selected by default', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('logsSourceUploadCard')).toBeInTheDocument();
      });

      // Upload card should be checked by default
      const uploadCard = getByTestId('logsSourceUploadCard');
      const radio = uploadCard.querySelector('input[type="radio"]');
      expect(radio).toBeChecked();
    });

    it('should switch to index source when index card is clicked', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('logsSourceIndexCard')).toBeInTheDocument();
      });

      // Click the index source card
      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

      // Index card should now be checked
      expect(radio).toBeChecked();
    });

    it('should enable index selector when index source is selected', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('logsSourceIndexCard')).toBeInTheDocument();
      });

      // Index select should be disabled initially (upload is default)
      const indexSelect = getByTestId('indexSelect');
      expect(indexSelect.querySelector('[data-test-subj="comboBoxSearchInput"]')).toBeDisabled();

      // Click the index source card
      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

      // Index select should now be enabled
      await waitFor(() => {
        expect(
          indexSelect.querySelector('[data-test-subj="comboBoxSearchInput"]')
        ).not.toBeDisabled();
      });
    });
  });

  describe('validation errors', () => {
    it('should show validation error for invalid index', async () => {
      mockUseValidateIndex.mockReturnValue({
        isValidating: false,
        validationError: 'Index is missing event.original field',
        validateIndex: mockValidateIndex,
        clearValidationError: mockClearValidationError,
      });

      const Wrapper = createWrapper();
      const { getByTestId, getByText } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('logsSourceIndexCard')).toBeInTheDocument();
      });

      // Switch to index source
      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

      // Error should be displayed
      await waitFor(() => {
        expect(getByText('Index is missing event.original field')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading state while indices are loading', async () => {
      mockUseFetchIndices.mockReturnValue({
        indices: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('logsSourceIndexCard')).toBeInTheDocument();
      });

      // Switch to index source
      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

      // The combobox should show loading state
      const indexSelect = getByTestId('indexSelect');
      expect(indexSelect.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });

    it('should show loading state while validating index', async () => {
      mockUseValidateIndex.mockReturnValue({
        isValidating: true,
        validationError: null,
        validateIndex: mockValidateIndex,
        clearValidationError: mockClearValidationError,
      });

      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('logsSourceIndexCard')).toBeInTheDocument();
      });

      // Switch to index source
      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

      // The combobox should show loading state
      const indexSelect = getByTestId('indexSelect');
      expect(indexSelect.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });
});
