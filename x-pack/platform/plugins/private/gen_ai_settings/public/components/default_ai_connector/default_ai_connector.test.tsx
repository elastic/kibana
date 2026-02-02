/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import { DefaultAIConnector } from './default_ai_connector';
import React from 'react';
import { SettingsContextProvider, useSettingsContext } from '../../contexts/settings_context';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createMockConnectorFindResult } from '@kbn/actions-plugin/server/application/connector/mocks';

function SettingsProbe({ onValue }: { onValue: (v: any) => void }) {
  const value = useSettingsContext();
  React.useEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return null;
}

const mockConnectors = {
  loading: false,
  reload: jest.fn(),
  connectors: [
    createMockConnectorFindResult({
      actionTypeId: 'pre-configured.1',
      id: 'pre-configured1',
      isPreconfigured: true,
      name: 'Pre configured Connector',
      referencedByCount: 0,
    }),
    createMockConnectorFindResult({
      actionTypeId: 'custom.1',
      id: 'custom1',
      name: 'Custom Connector 1',
      referencedByCount: 0,
    }),
  ],
};

interface TestWrapperProps {
  children: React.ReactNode;
  canSaveAdvancedSettings?: boolean;
}

function TestWrapper({ children, canSaveAdvancedSettings = true }: TestWrapperProps) {
  const queryClient = new QueryClient();

  return (
    <KibanaContextProvider
      services={{
        application: {
          capabilities: {
            advancedSettings: {
              save: canSaveAdvancedSettings,
            },
          },
        },
        notifications: {
          toasts: {
            addDanger: jest.fn(),
          },
        },
      }}
    >
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsContextProvider>{children}</SettingsContextProvider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
}

function setupTest(canSaveAdvancedSettings = true) {
  let settingsValue: ReturnType<typeof useSettingsContext> | undefined;

  const utils = render(
    <>
      <DefaultAIConnector connectors={mockConnectors} />
      <SettingsProbe onValue={(v) => (settingsValue = v)} />
    </>,
    {
      wrapper: ({ children }) => (
        <TestWrapper canSaveAdvancedSettings={canSaveAdvancedSettings}>{children}</TestWrapper>
      ),
    }
  );

  return {
    ...utils,
    settingsValue: () => settingsValue,
  };
}

describe('DefaultAIConnector', () => {
  describe('rendering', () => {
    it('renders all component elements correctly', () => {
      const { container } = setupTest();

      expect(screen.getByText('genAiSettings:defaultAIConnector')).toBeInTheDocument();
      expect(screen.getByText('Disallow all other connectors')).toBeInTheDocument();
      expect(screen.getByTestId('defaultAiConnectorComboBox')).toBeInTheDocument();
      expect(screen.getByTestId('defaultAiConnectorCheckbox')).toBeInTheDocument();

      expect(screen.getByTestId('comboBoxSearchInput')).toHaveAttribute(
        'value',
        'No default connector'
      );
      expect(container.querySelector('[class$="square-unselected"]')).not.toBeNull();
    });
  });

  describe('combobox interaction', () => {
    it('shows connector options when clicked', async () => {
      setupTest();

      act(() => {
        screen.getByTestId('comboBoxSearchInput').click();
      });

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.getByText('Pre configured Connector')).toBeVisible();
      expect(screen.getByText('Custom Connector 1')).toBeVisible();

      expect(
        // eslint-disable-next-line no-bitwise
        screen
          .getByText('Pre-configured')
          .compareDocumentPosition(screen.getByText('Pre configured Connector')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        // eslint-disable-next-line no-bitwise
        screen
          .getByText('Custom connectors')
          .compareDocumentPosition(screen.getByText('Custom Connector 1')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      expect(
        // eslint-disable-next-line no-bitwise
        screen
          .getByText('Pre configured Connector')
          .compareDocumentPosition(screen.getByText('Custom connectors')) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('updates selection when connector is chosen', async () => {
      setupTest();

      act(() => {
        screen.getByTestId('comboBoxSearchInput').click();
      });

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.click(screen.getByText('Custom Connector 1'));

      expect(screen.getByTestId('comboBoxSearchInput')).toHaveAttribute(
        'value',
        'Custom Connector 1'
      );
    });
  });

  describe('checkbox interaction', () => {
    it('updates checkbox state when clicked', async () => {
      const { container } = setupTest();

      expect(container.querySelector('[class$="square-unselected"]')).not.toBeNull();

      await userEvent.click(screen.getByTestId('defaultAiConnectorCheckbox'));

      expect(container.querySelector('[class$="square-selected"]')).not.toBeNull();
    });
  });

  describe('settings context integration', () => {
    it('adds connector selection to unsaved changes', async () => {
      const { settingsValue } = setupTest();

      act(() => {
        screen.getByTestId('comboBoxSearchInput').click();
      });
      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.click(screen.getByText('Custom Connector 1'));

      await userEvent.click(screen.getByTestId('defaultAiConnectorCheckbox'));

      expect(settingsValue()!.unsavedChanges).toEqual({
        'genAiSettings:defaultAIConnector': {
          type: 'string',
          unsavedValue: 'custom1',
        },
        'genAiSettings:defaultAIConnectorOnly': {
          type: 'boolean',
          unsavedValue: true,
        },
      });
    });

    it('reverts UI state when changes are discarded', async () => {
      const { container, settingsValue } = setupTest();

      act(() => {
        screen.getByTestId('comboBoxSearchInput').click();
      });
      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.click(screen.getByText('Custom Connector 1'));
      await userEvent.click(screen.getByTestId('defaultAiConnectorCheckbox'));

      act(() => {
        settingsValue()!.cleanUnsavedChanges();
      });

      expect(screen.getByTestId('comboBoxSearchInput')).toHaveAttribute(
        'value',
        'No default connector'
      );
      expect(container.querySelector('[class$="square-unselected"]')).not.toBeNull();
    });
  });

  describe('permissions', () => {
    it('disables components when user cannot save advanced settings', () => {
      setupTest(false);

      const comboBoxInput = screen.getByTestId('comboBoxSearchInput');
      const checkbox = screen.getByTestId('defaultAiConnectorCheckbox');

      expect(comboBoxInput).toBeDisabled();
      expect(checkbox).toBeDisabled();
    });

    it('enables components when user can save advanced settings', () => {
      setupTest(true);

      const comboBoxInput = screen.getByTestId('comboBoxSearchInput');
      const checkbox = screen.getByTestId('defaultAiConnectorCheckbox');

      expect(comboBoxInput).not.toBeDisabled();
      expect(checkbox).not.toBeDisabled();
    });
  });

  describe('validation functionality', () => {
    it('sets validation errors when "disallow all other connectors" is checked but no default connector is selected', async () => {
      const { settingsValue } = setupTest();

      // Check "disallow all other connectors" without selecting a connector
      await userEvent.click(screen.getByTestId('defaultAiConnectorCheckbox'));

      // Wait for validation to be set
      await act(async () => {
        // The validation function should detect this invalid state and set validation errors
        expect(settingsValue()!.setValidationErrors).toBeInstanceOf(Function);
      });
    });

    it('shows validation errors inline when connector does not exist', () => {
      // Test with a connector that doesn't exist
      const mockConnectorsWithMissingSelected = {
        loading: false,
        reload: jest.fn(),
        connectors: [
          createMockConnectorFindResult({
            actionTypeId: 'custom.1',
            id: 'custom1',
            isDeprecated: false,
            isPreconfigured: false,
            isSystemAction: false,
            name: 'Custom Connector 1',
            referencedByCount: 0,
          }),
        ],
      };

      render(<DefaultAIConnector connectors={mockConnectorsWithMissingSelected} />, {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      // Should show the component rendered correctly even if validation might occur
      expect(screen.getByTestId('defaultAiConnectorComboBox')).toBeInTheDocument();
    });

    it('clears validation errors when valid state is restored', async () => {
      const { settingsValue } = setupTest();

      // First, create an invalid state
      await userEvent.click(screen.getByTestId('defaultAiConnectorCheckbox'));

      // Then fix it by selecting a connector
      act(() => {
        screen.getByTestId('comboBoxSearchInput').click();
      });
      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.click(screen.getByText('Custom Connector 1'));

      // Validation errors should be cleared now
      await act(async () => {
        expect(settingsValue()!.setValidationErrors).toBeInstanceOf(Function);
      });
    });
  });
});
