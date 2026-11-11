/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react';
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
  useUploadSamples,
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
const mockUseUploadSamples = useUploadSamples as jest.Mock;
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

    mockUseUploadSamples.mockReturnValue({
      uploadSamplesMutation: { mutateAsync: mockUploadMutateAsync, isLoading: false },
      isLoading: false,
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

    it('disables the analyze button while the integration is being saved', async () => {
      mockUseCreateUpdateIntegration.mockReturnValue({
        createUpdateIntegrationMutation: { mutateAsync: mockMutateAsync, isLoading: true },
        isLoading: true,
        error: null,
      });

      const { getByTestId } = await renderFlyout(validForm);

      expect(getByTestId('analyzeLogsButton')).toBeDisabled();
    });

    it('disables the analyze button while samples are uploading', async () => {
      mockUseUploadSamples.mockReturnValue({
        uploadSamplesMutation: { mutateAsync: mockUploadMutateAsync, isLoading: true },
        isLoading: true,
      });

      const { getByTestId } = await renderFlyout(validForm);

      expect(getByTestId('analyzeLogsButton')).toBeDisabled();
    });

    it('disables the analyze button while the index is being validated', async () => {
      mockUseValidateIndex.mockReturnValue({
        isValidating: true,
        validationError: null,
        validateIndex: mockValidateIndex,
        clearValidationError: mockClearValidationError,
      });

      const { getByTestId } = await renderFlyout(validForm);

      expect(getByTestId('analyzeLogsButton')).toBeDisabled();
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

  describe('log file validation', () => {
    const formWithoutLogSample = { ...validForm, logSample: undefined };

    const selectFile = async (file: File) => {
      const input = document.querySelector('input[type="file"]');
      expect(input).not.toBeNull();
      await act(async () => {
        fireEvent.change(input!, { target: { files: [file] } });
      });
    };

    it('rejects a file with a blocked extension', async () => {
      const { findByText, getByTestId } = await renderFlyout(formWithoutLogSample);

      await selectFile(new File(['print("hello")'], 'script.py'));

      expect(
        await findByText(
          "Files of type .py aren't supported. Upload a file that contains log samples."
        )
      ).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(getByTestId('analyzeLogsButton'));
      });
      expectNothingSubmitted();
    });

    it('rejects a compressed file', async () => {
      const { findByText } = await renderFlyout(formWithoutLogSample);

      await selectFile(new File(['compressed'], 'syslog.2.gz'));

      expect(
        await findByText(
          "Compressed files aren't supported. Decompress the file and upload the logs."
        )
      ).toBeInTheDocument();
    });

    it('rejects an image renamed to .log', async () => {
      const { findByText } = await renderFlyout(formWithoutLogSample);
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49]);

      await selectFile(new File([jpegBytes], 'photo.log'));

      expect(
        await findByText("This file doesn't appear to contain text log samples.")
      ).toBeInTheDocument();
    });

    it('rejects a script renamed to .log', async () => {
      const { findByText } = await renderFlyout(formWithoutLogSample);

      await selectFile(
        new File(['#!/usr/bin/env python\nimport os\nprint(os.getcwd())\n'], 'script.log')
      );

      expect(
        await findByText('This file looks like a script or source code, not log samples.')
      ).toBeInTheDocument();
    });

    it('rejects source code without a shebang renamed to .log', async () => {
      const { findByText } = await renderFlyout(formWithoutLogSample);

      await selectFile(
        new File(
          ['"""Validation for Dynaconf settings."""\n\nfrom dynaconf.validator import Validator\n'],
          'test.log'
        )
      );

      expect(
        await findByText('This file looks like a script or source code, not log samples.')
      ).toBeInTheDocument();
    });

    it('rejects a file without any log lines', async () => {
      const { findByText } = await renderFlyout(formWithoutLogSample);

      await selectFile(new File(['\n  \n'], 'empty.log'));

      expect(await findByText("This file doesn't contain any log lines.")).toBeInTheDocument();
    });

    it('explains when every line is too long to upload', async () => {
      const { findByText } = await renderFlyout(formWithoutLogSample);

      await selectFile(new File([`{"Records":["${'a'.repeat(100_001)}"]}`], 'cloudtrail.json'));

      expect(
        await findByText(
          'Every line in this file is longer than 100,000 characters. Put each log event on its own line.'
        )
      ).toBeInTheDocument();
    });

    it('accepts a log file and uploads its samples', async () => {
      const { getByTestId, queryByText } = await renderFlyout(formWithoutLogSample);

      await selectFile(
        new File(
          [
            '<134>Nov  9 14:06:01 host sshd[123]: Accepted\n<134>Nov  9 14:06:02 host sshd[123]: Closed',
          ],
          'auth.log'
        )
      );
      await waitFor(() => {
        expect(getByTestId('analyzeLogsButton')).toBeEnabled();
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
      });
      expect(mockUploadMutateAsync.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          samples: [
            '<134>Nov  9 14:06:01 host sshd[123]: Accepted',
            '<134>Nov  9 14:06:02 host sshd[123]: Closed',
          ],
          originalSource: { sourceType: 'file', sourceValue: 'auth.log' },
        })
      );
      expect(queryByText("This file doesn't appear to contain text log samples.")).toBeNull();
    });

    it.each([
      ['UTF-16LE', [0xff, 0xfe], false],
      ['UTF-16BE', [0xfe, 0xff], true],
    ])('accepts a %s log file with a byte order mark', async (_name, bom, isBigEndian) => {
      const { getByTestId } = await renderFlyout(formWithoutLogSample);
      const text = '2026-11-11 14:06:01 user logged on\r\n2026-11-11 14:06:02 user logged off';
      const textBytes = Buffer.from(text, 'utf16le');
      if (isBigEndian) {
        textBytes.swap16();
      }

      await selectFile(new File([Uint8Array.from([...bom, ...textBytes])], 'events.log'));
      await waitFor(() => {
        expect(getByTestId('analyzeLogsButton')).toBeEnabled();
      });

      fireEvent.click(getByTestId('analyzeLogsButton'));

      await waitFor(() => {
        expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
      });
      expect(mockUploadMutateAsync.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          samples: ['2026-11-11 14:06:01 user logged on', '2026-11-11 14:06:02 user logged off'],
        })
      );
    });

    const delayReadAsText = (slowFile: File) => {
      const originalReadAsText = FileReader.prototype.readAsText;
      let releaseSlowRead: (() => Promise<void>) | undefined;
      const readAsTextSpy = jest
        .spyOn(FileReader.prototype, 'readAsText')
        .mockImplementation(function (this: FileReader, blob: Blob, encoding?: string) {
          if (blob === slowFile) {
            releaseSlowRead = () =>
              new Promise((resolve) => {
                this.addEventListener('loadend', () => resolve());
                originalReadAsText.call(this, blob, encoding);
              });
            return;
          }
          originalReadAsText.call(this, blob, encoding);
        });

      return {
        getReleaseSlowRead: () => releaseSlowRead,
        restore: () => readAsTextSpy.mockRestore(),
      };
    };

    it('ignores a slower earlier file once a newer file is rejected', async () => {
      const { findByText, getByTestId } = await renderFlyout(formWithoutLogSample);
      const slowFile = new File(['<134>Nov  9 14:06:01 host sshd[123]: Accepted'], 'slow.log');
      const { getReleaseSlowRead, restore } = delayReadAsText(slowFile);

      try {
        await selectFile(slowFile);
        await waitFor(() => expect(getReleaseSlowRead()).toBeDefined());

        await selectFile(new File(['print("hello")'], 'script.py'));
        const blockedMessage =
          "Files of type .py aren't supported. Upload a file that contains log samples.";
        expect(await findByText(blockedMessage)).toBeInTheDocument();

        await act(async () => {
          await getReleaseSlowRead()?.();
        });

        expect(await findByText(blockedMessage)).toBeInTheDocument();
        await waitFor(() => {
          expect(getByTestId('analyzeLogsButton')).toBeEnabled();
        });
        await act(async () => {
          fireEvent.click(getByTestId('analyzeLogsButton'));
        });
        expectNothingSubmitted();
      } finally {
        restore();
      }
    });

    it('ignores a slower earlier rejected file once a newer file is accepted', async () => {
      const { getByTestId, queryByText } = await renderFlyout(formWithoutLogSample);
      const slowFile = new File(['#!/bin/sh\necho hello'], 'slow.log');
      const { getReleaseSlowRead, restore } = delayReadAsText(slowFile);

      try {
        await selectFile(slowFile);
        await waitFor(() => expect(getReleaseSlowRead()).toBeDefined());

        await selectFile(new File(['<134>Nov  9 14:06:01 host sshd[123]: Accepted'], 'auth.log'));
        await waitFor(() => {
          expect(getByTestId('analyzeLogsButton')).toBeEnabled();
        });

        await act(async () => {
          await getReleaseSlowRead()?.();
        });

        expect(
          queryByText('This file looks like a script or source code, not log samples.')
        ).toBeNull();
        await act(async () => {
          fireEvent.click(getByTestId('analyzeLogsButton'));
        });
        await waitFor(() => {
          expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
        });
        expect(mockUploadMutateAsync.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            samples: ['<134>Nov  9 14:06:01 host sshd[123]: Accepted'],
            originalSource: { sourceType: 'file', sourceValue: 'auth.log' },
          })
        );
      } finally {
        restore();
      }
    });
  });
});
