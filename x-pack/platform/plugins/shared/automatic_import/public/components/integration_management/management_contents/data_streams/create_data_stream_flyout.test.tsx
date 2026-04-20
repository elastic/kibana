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
  normalizeTitleName: jest.fn((v: string) => v.toLowerCase().replace(/\s+/g, '_')),
  isValidNameFormat: jest.fn((v: string) => /^[a-zA-Z0-9_ ]+$/.test(v.trim())),
  startsWithLetter: jest.fn((v: string) => /^[a-zA-Z]/.test(v.trim())),
  useKibana: jest.fn(() => ({
    services: {
      http: {},
      notifications: { toasts: { addError: jest.fn(), addWarning: jest.fn() } },
      application: { navigateToApp: jest.fn() },
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

const mockReportAnalyzeLogsTriggered = jest.fn();
jest.mock('../../../telemetry_context', () => ({
  useTelemetry: () => ({
    reportAnalyzeLogsTriggered: mockReportAnalyzeLogsTriggered,
  }),
}));

const mockUseFetchIndices = useFetchIndices as jest.Mock;
const mockUseValidateIndex = useValidateIndex as jest.Mock;
const mockUseGetIntegrationById = useGetIntegrationById as jest.Mock;
const mockUseCreateUpdateIntegration = useCreateUpdateIntegration as jest.Mock;
const mockRefetch = jest.fn();

const mockServices = coreMock.createStart();

const createWrapper = (
  initialValue?: React.ComponentProps<typeof IntegrationFormProvider>['initialValue']
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  function CreateDataStreamFlyoutTestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/create']}>
              <Route path={['/edit/:integrationId', '/create']}>
                <UIStateProvider>
                  <IntegrationFormProvider onSubmit={jest.fn()} initialValue={initialValue}>
                    {children}
                  </IntegrationFormProvider>
                </UIStateProvider>
              </Route>
            </MemoryRouter>
          </QueryClientProvider>
        </KibanaContextProvider>
      </I18nProvider>
    );
  }

  return CreateDataStreamFlyoutTestWrapper;
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

    mockRefetch.mockClear();
    mockUseGetIntegrationById.mockReturnValue({
      integration: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
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

      expect(getByTestId('dataStreamTitleInputV2')).toBeInTheDocument();
      expect(getByTestId('dataStreamDescriptionInputV2')).toBeInTheDocument();
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

    it('should keep analyze button disabled when data stream description is empty', async () => {
      const Wrapper = createWrapper({
        title: 'Integration',
        description: 'Integration description',
        connectorId: 'connector-1',
        dataStreamTitle: 'My stream',
        dataStreamDescription: '',
        dataCollectionMethod: ['filestream'],
        logSample: '2024-01-01 level=info msg=test',
      });
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

  describe('refetch after creation', () => {
    it('should get refetch function from useGetIntegrationById hook', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      expect(mockUseGetIntegrationById).toHaveBeenCalled();
    });
  });

  describe('duplicate data stream name validation', () => {
    it('should disable analyze button when entering a duplicate data stream name', async () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: {
          integrationId: 'test-integration',
          title: 'Test Integration',
          description: 'Test description',
          dataStreams: [{ dataStreamId: 'ds-1', title: 'Existing Data Stream', inputTypes: [] }],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('dataStreamTitleInputV2')).toBeInTheDocument();
      });

      fireEvent.change(getByTestId('dataStreamTitleInputV2'), {
        target: { value: 'existing data stream' },
      });

      expect(getByTestId('analyzeLogsButton')).toBeDisabled();
    });

    it('should disable analyze button for case-insensitive duplicate names', async () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: {
          integrationId: 'test-integration',
          title: 'Test Integration',
          description: 'Test description',
          dataStreams: [{ dataStreamId: 'ds-1', title: 'My Data Stream', inputTypes: [] }],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('dataStreamTitleInputV2')).toBeInTheDocument();
      });

      fireEvent.change(getByTestId('dataStreamTitleInputV2'), {
        target: { value: 'MY DATA STREAM' },
      });

      expect(getByTestId('analyzeLogsButton')).toBeDisabled();
    });

    it('should allow unique data stream names', async () => {
      mockUseGetIntegrationById.mockReturnValue({
        integration: {
          integrationId: 'test-integration',
          title: 'Test Integration',
          description: 'Test description',
          dataStreams: [{ dataStreamId: 'ds-1', title: 'Existing Stream', inputTypes: [] }],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('dataStreamTitleInputV2')).toBeInTheDocument();
      });

      fireEvent.change(getByTestId('dataStreamTitleInputV2'), {
        target: { value: 'New Unique Stream' },
      });

      const titleInput = getByTestId('dataStreamTitleInputV2');
      expect(titleInput.getAttribute('aria-invalid')).not.toBe('true');
    });
  });

  describe('telemetry', () => {
    it('should render without telemetry errors', async () => {
      const Wrapper = createWrapper();
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('createDataStreamFlyout')).toBeInTheDocument();
      });
    });
  });
});
