/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConnectorSelector } from './connector_selector';
import { ConnectorSetup } from './connector_setup';
import { useLoadConnectors } from '..';

const mockConnectors = [
  {
    id: 'connector-1',
    name: 'My OpenAI Connector',
    actionTypeId: '.gen-ai',
    isPreconfigured: false,
    isMissingSecrets: false,
  },
  {
    id: 'connector-2',
    name: 'My Bedrock Connector',
    actionTypeId: '.bedrock',
    isPreconfigured: true,
    isMissingSecrets: false,
  },
  {
    id: 'Elastic-Managed-LLM',
    name: 'Elastic Managed LLM',
    actionTypeId: '.inference',
    isPreconfigured: true,
    isMissingSecrets: false,
  },
];

const mockActionTypes = [
  { id: '.gen-ai', name: 'OpenAI', enabled: true },
  { id: '.bedrock', name: 'Amazon Bedrock', enabled: true },
  { id: '.gemini', name: 'Google Gemini', enabled: true },
  { id: '.inference', name: 'Inference', enabled: true },
];

// Mock the useLoadConnectors hook
const mockRefetch = jest.fn();
jest.mock('../hooks/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    connectors: [],
    isLoading: false,
    refetch: jest.fn(),
  })),
}));
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;

const mockHttpGet = jest.fn();
const mockSettingsGet = jest.fn().mockReturnValue(undefined);
const mockGetAddConnectorFlyout = jest
  .fn()
  .mockReturnValue(<div data-test-subj="addConnectorFlyout" />);

const createMockServices = () => {
  const coreStart = coreMock.createStart();
  return {
    ...coreStart,
    http: {
      ...coreStart.http,
      get: mockHttpGet,
    },
    settings: {
      client: {
        get: mockSettingsGet,
      },
    },
    triggersActionsUi: {
      ...triggersActionsUiMock.createStart(),
      getAddConnectorFlyout: mockGetAddConnectorFlyout,
      actionTypeRegistry: {
        get: jest.fn().mockReturnValue({ iconClass: 'logoOpenAI' }),
      },
    },
  };
};

const mockServices = createMockServices();

const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
  </I18nProvider>
);

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { form } = useForm({
    defaultValue: { connectorId: '' },
  });

  return (
    <Form form={form}>
      {children}
      <span data-test-subj="formConnectorId">
        {String(form.getFields().connectorId?.value ?? '')}
      </span>
    </Form>
  );
};

const renderConnectorSelector = async (props = {}) => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <TestProviders>
        <FormWrapper>
          <ConnectorSelector {...props} />
        </FormWrapper>
      </TestProviders>
    );
  });
  return result!;
};

const renderConnectorSetup = (props: { onClose: jest.Mock; onConnectorCreated?: jest.Mock }) => {
  return render(
    <TestProviders>
      <ConnectorSetup {...props} />
    </TestProviders>
  );
};

describe('ConnectorSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoadConnectors.mockReturnValue({
      connectors: mockConnectors,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  describe('rendering', () => {
    it('should render the connector selector button', async () => {
      const { getByTestId } = await renderConnectorSelector();
      expect(getByTestId('connector-selector')).toBeInTheDocument();
    });

    it('should show loading spinner when connectors are loading', async () => {
      mockUseLoadConnectors.mockReturnValue({
        connectors: mockConnectors,
        isLoading: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = await renderConnectorSelector();
      expect(getByTestId('connectorSelectorLoading')).toBeInTheDocument();
    });

    it('should show "Add connector" button when no connectors exist', async () => {
      mockUseLoadConnectors.mockReturnValue({
        connectors: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = await renderConnectorSelector();
      expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
    });

    it('should display the selected connector name on the button', async () => {
      const { getByTestId } = await renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('Elastic Managed LLM');
      });
    });
  });

  describe('default connector selection', () => {
    it('should select Elastic Managed LLM as default when available', async () => {
      const { getByTestId } = await renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('Elastic Managed LLM');
      });
    });

    it('should select user settings default connector when set', async () => {
      mockSettingsGet.mockReturnValue('connector-1');

      const { getByTestId } = await renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('My OpenAI Connector');
      });
    });

    it('should select first available connector when no default is set and no Elastic LLM', async () => {
      mockUseLoadConnectors.mockReturnValue({
        connectors: [mockConnectors[0], mockConnectors[1]], // No Elastic Managed LLM
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = await renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('My OpenAI Connector');
      });
    });
  });

  describe('popover interactions', () => {
    it('should open popover when button is clicked', async () => {
      const { getByTestId, queryByTestId } = await renderConnectorSelector();

      await act(async () => {
        fireEvent.click(getByTestId('connector-selector'));
      });

      await waitFor(() => {
        expect(queryByTestId('connectorSelectorPopover')).toBeInTheDocument();
      });
    });
  });

  describe('connector creation', () => {
    it('should open connector setup when "Add connector" is clicked with no connectors', async () => {
      mockUseLoadConnectors.mockReturnValue({
        connectors: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId, findByTestId } = await renderConnectorSelector();

      await act(async () => {
        fireEvent.click(getByTestId('addNewConnectorButton'));
      });

      const flyout = await findByTestId('connectorSetupFlyout');
      expect(flyout).toBeInTheDocument();
    });
  });
});

describe('ConnectorSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet.mockResolvedValue(mockActionTypes);
  });

  describe('rendering', () => {
    it('should show loading spinner while loading action types', async () => {
      mockHttpGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const onClose = jest.fn();
      const { getByTestId } = renderConnectorSetup({ onClose });

      expect(getByTestId('connectorSetupLoading')).toBeInTheDocument();
    });

    it('should render flyout with AI connector types', async () => {
      const onClose = jest.fn();
      const { findByTestId, findByText } = renderConnectorSetup({ onClose });

      await findByTestId('connectorSetupPage');

      expect(await findByText('OpenAI')).toBeInTheDocument();
      expect(await findByText('Amazon Bedrock')).toBeInTheDocument();
      expect(await findByText('Google Gemini')).toBeInTheDocument();
    });

    it('should show "No AI connector types available" when no types exist', async () => {
      mockHttpGet.mockResolvedValue([]);

      const onClose = jest.fn();
      const { findByTestId } = renderConnectorSetup({ onClose });

      expect(await findByTestId('noConnectorTypes')).toBeInTheDocument();
    });

    it('should filter to only AI connector types', async () => {
      mockHttpGet.mockResolvedValue([
        ...mockActionTypes,
        { id: '.email', name: 'Email', enabled: true }, // Non-AI connector
        { id: '.slack', name: 'Slack', enabled: true }, // Non-AI connector
      ]);

      const onClose = jest.fn();
      const { findByTestId, queryByText } = renderConnectorSetup({ onClose });

      await findByTestId('connectorSetupPage');

      // AI connectors should be present
      expect(queryByText('OpenAI')).toBeInTheDocument();
      // Non-AI connectors should NOT be present
      expect(queryByText('Email')).not.toBeInTheDocument();
      expect(queryByText('Slack')).not.toBeInTheDocument();
    });
  });

  describe('connector type selection', () => {
    it('should open add connector flyout when a connector type is clicked', async () => {
      const onClose = jest.fn();
      const { findByTestId } = renderConnectorSetup({ onClose });

      await findByTestId('connectorSetupPage');

      await act(async () => {
        fireEvent.click(await findByTestId('actionType-.gen-ai'));
      });

      expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialConnector: { actionTypeId: '.gen-ai' },
        })
      );
    });
  });

  describe('callbacks', () => {
    it('should call onClose when flyout is closed', async () => {
      const onClose = jest.fn();
      const { findByRole } = renderConnectorSetup({ onClose });

      // Find and click the close button
      const closeButton = await findByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should show error toast when loading action types fails', async () => {
      mockHttpGet.mockRejectedValue(new Error('Network error'));

      const onClose = jest.fn();
      renderConnectorSetup({ onClose });

      await waitFor(() => {
        expect(mockServices.notifications.toasts.addDanger).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Unable to load connector types',
          })
        );
      });
    });
  });
});
