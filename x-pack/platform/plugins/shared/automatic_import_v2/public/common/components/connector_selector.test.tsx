/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConnectorSelector } from './connector_selector';
import { ConnectorSetup } from './connector_setup';
import {
  mockConnectors,
  mockActionTypes,
  createMockServices,
  createTestProviders,
} from '../../../__jest__/fixtures/mocks';
import { useLoadConnectors } from '../hooks/use_load_connectors';

// Mock the useLoadConnectors hook
const mockRefetch = jest.fn();
jest.mock('../hooks/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    connectors: mockConnectors,
    isLoading: false,
    refetch: mockRefetch,
  })),
}));
const mockUseLoadConnectors = useLoadConnectors as jest.Mock;
const mockHttpGet = jest.fn();
const mockSettingsGet = jest.fn().mockReturnValue(undefined);
const mockGetAddConnectorFlyout = jest
  .fn()
  .mockReturnValue(<div data-test-subj="addConnectorFlyout" />);

const mockServices = createMockServices({
  http: {
    get: mockHttpGet,
  },
  settings: {
    client: {
      get: mockSettingsGet,
    },
  },
  triggersActionsUi: {
    getAddConnectorFlyout: mockGetAddConnectorFlyout,
    actionTypeRegistry: {
      get: jest.fn().mockReturnValue({ iconClass: 'logoOpenAI' }),
    },
  },
});

const TestProviders = createTestProviders(mockServices);

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

const renderConnectorSelector = (props = {}) => {
  return render(
    <TestProviders>
      <FormWrapper>
        <ConnectorSelector {...props} />
      </FormWrapper>
    </TestProviders>
  );
};

const renderConnectorSetup = (props: { onClose: jest.Mock; onConnectorCreated?: jest.Mock }) => {
  return render(
    <TestProviders>
      <ConnectorSetup {...props} />
    </TestProviders>
  );
};

// Test begins here

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
    it('should render the connector selector button', () => {
      const { getByTestId } = renderConnectorSelector();
      expect(getByTestId('connector-selector')).toBeInTheDocument();
    });

    it('should show loading spinner when connectors are loading', () => {
      mockUseLoadConnectors.mockReturnValue({
        connectors: mockConnectors,
        isLoading: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = renderConnectorSelector();
      expect(getByTestId('connectorSelectorLoading')).toBeInTheDocument();
    });

    it('should show "Add connector" button when no connectors exist', () => {
      mockUseLoadConnectors.mockReturnValue({
        connectors: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = renderConnectorSelector();
      expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
    });

    it('should display the selected connector name on the button', async () => {
      const { getByTestId } = renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('Elastic Managed LLM');
      });
    });
  });

  describe('default connector selection', () => {
    it('should select Elastic Managed LLM as default when available', async () => {
      const { getByTestId } = renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('Elastic Managed LLM');
      });
    });

    it('should select user settings default connector when set', async () => {
      mockSettingsGet.mockReturnValue('connector-1');

      const { getByTestId } = renderConnectorSelector();

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

      const { getByTestId } = renderConnectorSelector();

      await waitFor(() => {
        expect(getByTestId('connector-selector')).toHaveTextContent('My OpenAI Connector');
      });
    });
  });

  describe('popover interactions', () => {
    it('should open popover when button is clicked', async () => {
      const { getByTestId, queryByTestId } = renderConnectorSelector();

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

      const { getByTestId, findByTestId } = renderConnectorSelector();

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
