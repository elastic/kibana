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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';

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
    {
      actionTypeId: 'pre-configured.1',
      id: 'pre-configured1',
      isDeprecated: false,
      isPreconfigured: true,
      isSystemAction: false,
      name: 'Pre configured Connector',
      referencedByCount: 0,
    },
    {
      actionTypeId: 'custom.1',
      id: 'custom1',
      isDeprecated: false,
      isPreconfigured: false,
      isSystemAction: false,
      name: 'Custom Connector 1',
      referencedByCount: 0,
    },
  ],
};

function setupTest() {
  const queryClient = new QueryClient();
  let settingsValue: ReturnType<typeof useSettingsContext> | undefined;

  const utils = render(
    <>
      <DefaultAIConnector connectors={mockConnectors} />
      <SettingsProbe onValue={(v) => (settingsValue = v)} />
    </>,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <SettingsContextProvider>{children}</SettingsContextProvider>
          </QueryClientProvider>
        </I18nProvider>
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
});
