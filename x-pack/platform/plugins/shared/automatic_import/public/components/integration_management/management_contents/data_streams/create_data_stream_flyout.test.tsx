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
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  useFetchIndices,
  useValidateIndex,
  useGetIntegrationById,
  useCreateUpdateIntegration,
} from '../../../../common';

const mockAddWarning = jest.fn();
const mockAddError = jest.fn();
const mockUploadMutateAsync = jest.fn();
const mockFetchTakenPackageNames = jest.fn(
  (): Promise<Set<string>> => Promise.resolve(new Set<string>())
);

jest.mock('../../../../common', () => ({
  fetchTakenPackageNames: () => mockFetchTakenPackageNames(),
  useFetchIndices: jest.fn(),
  useValidateIndex: jest.fn(),
  useGetIntegrationById: jest.fn(),
  useCreateUpdateIntegration: jest.fn(),
  useUploadSamples: jest.fn(() => ({
    uploadSamplesMutation: {
      mutateAsync: mockUploadMutateAsync,
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
      notifications: { toasts: { addError: mockAddError, addWarning: mockAddWarning } },
      application: { navigateToApp: jest.fn() },
    },
  })),
}));
const mockGetInstalledPackages = jest.fn(
  (): Promise<{ items: Array<{ id: string; type: string }> }> => Promise.resolve({ items: [] })
);
const mockGetAllIntegrations = jest.fn((): Promise<unknown[]> => Promise.resolve([]));
jest.mock('../../../../common/lib/api', () => ({
  getInstalledPackages: (...args: unknown[]) => mockGetInstalledPackages(...(args as [])),
  getAllIntegrations: (...args: unknown[]) => mockGetAllIntegrations(...(args as [])),
  getAllIntegrationNames: (...args: unknown[]) => mockGetAllIntegrations(...(args as [])),
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
  initialValue?: React.ComponentProps<typeof IntegrationFormProvider>['initialValue'],
  existingDataStreamTitles?: Set<string>
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
                  <IntegrationFormProvider
                    onSubmit={jest.fn()}
                    initialValue={initialValue}
                    existingDataStreamTitles={existingDataStreamTitles}
                  >
                    <UseField path="title">{() => null}</UseField>
                    <UseField path="description">{() => null}</UseField>
                    <UseField path="connectorId">{() => null}</UseField>
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

    mockUploadMutateAsync.mockResolvedValue({ success: true });
    mockFetchTakenPackageNames.mockResolvedValue(new Set<string>());
  });

  const validForm = {
    title: 'Integration',
    description: 'Integration description',
    connectorId: 'connector-1',
    dataStreamTitle: 'My stream',
    dataStreamDescription: 'Stream description',
    dataCollectionMethod: ['filestream'],
    logSample: '2024-01-01 level=info msg=test',
  };

  const renderFlyout = async (
    initialValue?: React.ComponentProps<typeof IntegrationFormProvider>['initialValue'],
    existingDataStreamTitles?: Set<string>
  ) => {
    const Wrapper = createWrapper(initialValue, existingDataStreamTitles);
    const result = render(
      <Wrapper>
        <CreateDataStreamFlyout onClose={mockOnClose} />
      </Wrapper>
    );
    await waitFor(() => {
      expect(mockFetchTakenPackageNames).toHaveBeenCalled();
      expect(result.getByTestId('analyzeLogsButton')).toBeInTheDocument();
    });
    return result;
  };

  const expectNothingSubmitted = () => {
    expect(mockUploadMutateAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  };

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

  describe('analyze button validation', () => {
    it('keeps the analyze button enabled when the form is empty', async () => {
      const { getByTestId } = await renderFlyout();

      expect(getByTestId('analyzeLogsButton')).toBeEnabled();
    });

    it('shows inline errors for empty required fields on click and does not submit', async () => {
      const { getByTestId, getByText } = await renderFlyout({
        title: 'Integration',
        description: 'Integration description',
        connectorId: 'connector-1',
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByText('Data stream title is required')).toBeInTheDocument();
      });
      expect(getByText('Data stream description is required')).toBeInTheDocument();
      expect(getByText('Please select a data collection method')).toBeInTheDocument();
      expect(getByText('A log sample is required for analysis')).toBeInTheDocument();
      expect(getByTestId('dataStreamTitleInputV2')).toHaveAttribute('aria-invalid', 'true');
      expectNothingSubmitted();
    });

    it('does not show inline errors before the analyze button is clicked', async () => {
      const { queryByText } = await renderFlyout();

      expect(queryByText('Data stream title is required')).not.toBeInTheDocument();
    });

    it('shows an inline error when the data stream description is empty', async () => {
      const { getByTestId, getByText } = await renderFlyout({
        ...validForm,
        dataStreamDescription: '',
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByText('Data stream description is required')).toBeInTheDocument();
      });
      expectNothingSubmitted();
    });

    it('shows an inline error when the data stream title is a single character', async () => {
      const { getByTestId, getByText } = await renderFlyout({
        ...validForm,
        dataStreamTitle: 'B',
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByText('Name must be at least 2 characters long')).toBeInTheDocument();
      });
      expectNothingSubmitted();
    });

    it('shows an inline error when the index source is selected without an index', async () => {
      const { getByTestId, getByText } = await renderFlyout({
        ...validForm,
        logSample: undefined,
      });

      const radio = getByTestId('logsSourceIndexCard').querySelector('input[type="radio"]');
      fireEvent.click(radio!);
      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByText('Please select an index')).toBeInTheDocument();
      });
      expectNothingSubmitted();
    });

    it('shows the integration details callout when the connector is missing', async () => {
      const { getByTestId, getByText } = await renderFlyout({ ...validForm, connectorId: '' });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByTestId('integrationDetailsInvalidCallout')).toBeInTheDocument();
      });
      expect(getByText('Please select a connector')).toBeInTheDocument();
      expectNothingSubmitted();
    });

    it('shows the integration details callout when the integration title is a single character', async () => {
      const { getByTestId } = await renderFlyout({ ...validForm, title: 'A' });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByTestId('integrationDetailsInvalidCallout')).toHaveTextContent(
          'Name must be at least 2 characters long'
        );
      });
      expectNothingSubmitted();
    });

    it('does not show the integration details callout when integration fields are valid', async () => {
      const { getByTestId, queryByTestId } = await renderFlyout(validForm);

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
      expect(queryByTestId('integrationDetailsInvalidCallout')).not.toBeInTheDocument();
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

      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

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

      const indexSelect = getByTestId('indexSelect');
      expect(indexSelect.querySelector('[data-test-subj="comboBoxSearchInput"]')).toBeDisabled();

      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

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

      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

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

      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

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

      const indexCard = getByTestId('logsSourceIndexCard');
      const radio = indexCard.querySelector('input[type="radio"]');
      fireEvent.click(radio!);

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
    it('shows an inline error and does not submit a duplicate data stream name', async () => {
      const { getByTestId, getByText } = await renderFlyout(
        { ...validForm, dataStreamTitle: 'existing data stream' },
        new Set(['existing_data_stream'])
      );

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByText('A data stream with this name already exists')).toBeInTheDocument();
      });
      expectNothingSubmitted();
    });

    it('treats duplicate data stream names case-insensitively', async () => {
      const { getByTestId, getByText } = await renderFlyout(
        { ...validForm, dataStreamTitle: 'MY DATA STREAM' },
        new Set(['my_data_stream'])
      );

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByText('A data stream with this name already exists')).toBeInTheDocument();
      });
      expectNothingSubmitted();
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

  describe('duplicate integration name validation', () => {
    it('shows the integration details callout when the integration name already exists', async () => {
      mockFetchTakenPackageNames.mockResolvedValue(new Set(['existing_integration']));

      const { getByTestId } = await renderFlyout({
        ...validForm,
        title: 'Existing Integration',
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(getByTestId('integrationDetailsInvalidCallout')).toHaveTextContent(
          'An integration with this name already exists'
        );
      });
      expectNothingSubmitted();
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

  describe('sample upload limits', () => {
    it('still uploads the capped samples when the file exceeds the line limit', async () => {
      const extraLines = 5;
      const logSample = Array.from({ length: 1000 + extraLines }, (_, i) => `log line ${i}`).join(
        '\n'
      );
      const Wrapper = createWrapper({ ...validForm, logSample });
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('analyzeLogsButton')).not.toBeDisabled();
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
      });

      const uploadRequest = mockUploadMutateAsync.mock.calls[0][0];
      expect(uploadRequest.samples).toHaveLength(1000);
      expect(uploadRequest.samples[0]).toBe('log line 0');
      expect(uploadRequest.samples[999]).toBe('log line 999');
      expect(mockAddWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sample log limits applied',
        })
      );
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('uploads all samples without a warning when the file is within limits', async () => {
      const Wrapper = createWrapper({
        ...validForm,
        logSample: 'log line 1\nlog line 2',
      });
      const { getByTestId } = render(
        <Wrapper>
          <CreateDataStreamFlyout onClose={mockOnClose} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByTestId('analyzeLogsButton')).not.toBeDisabled();
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
      });

      expect(mockUploadMutateAsync.mock.calls[0][0].samples).toEqual(['log line 1', 'log line 2']);
      expect(mockAddWarning).not.toHaveBeenCalled();
    });
  });
});
