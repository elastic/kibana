/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import {
  DefaultAIConnector,
} from './default_ai_connector';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { FieldDefinition, UnsavedFieldChange } from '@kbn/management-settings-types';
import { UiSettingsType } from '@kbn/core-ui-settings-common';
import { IToasts } from '@kbn/core-notifications-browser';
import { ApplicationStart } from '@kbn/core-application-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import React from 'react';
import { DefaultAiConnectorSettingsContextProvider } from '../context/default_ai_connector_context';
import { FeatureFlagsStart } from '@kbn/core/public';

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

function setupTest({
  fields,
  unsavedChanges,
  enabled = true,
}: {
  fields: Record<
    string,
    FieldDefinition<
      UiSettingsType,
      string | number | boolean | (string | number)[] | null | undefined
    >
  >;
  unsavedChanges: Record<string, UnsavedFieldChange<UiSettingsType>>;
  enabled?: boolean;
}) {
  const queryClient = new QueryClient();
  const handleFieldChange = jest.fn();

  const settings = {
    handleFieldChange,
    fields,
    unsavedChanges,
  };

  const utils = render(
    <>
      <DefaultAIConnector connectors={mockConnectors} settings={settings} />
    </>,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <DefaultAiConnectorSettingsContextProvider
              application={
                {
                  getUrlForApp: jest.fn(),
                } as unknown as ApplicationStart
              }
              docLinks={{} as DocLinksStart}
              featureFlags={
                {} as unknown as FeatureFlagsStart
              }
              toast={{} as IToasts}
            >
              {children}
            </DefaultAiConnectorSettingsContextProvider>
          </QueryClientProvider>
        </I18nProvider>
      ),
    }
  );

  return {
    ...utils,
    handleFieldChange,
  };
}

describe('DefaultAIConnector', () => {
  describe('rendering', () => {
    it('renders all component elements correctly', () => {
      const { container } = setupTest({
        fields: {},
        unsavedChanges: {},
      });

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

    it('does not render when feature flag is off', () => {
      setupTest({
        fields: {},
        unsavedChanges: {},
        enabled: false,
      });

      expect(screen.queryByText('genAiSettings:defaultAIConnector')).not.toBeInTheDocument();
      expect(screen.queryByText('Disallow all other connectors')).not.toBeInTheDocument();
      expect(screen.queryByTestId('defaultAiConnectorComboBox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('defaultAiConnectorCheckbox')).not.toBeInTheDocument();
    });
  });

  describe('combobox interaction', () => {
    it('shows connector options when clicked', async () => {
      setupTest({
        fields: {},
        unsavedChanges: {},
      });

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
      const { handleFieldChange } = setupTest({
        fields: {},
        unsavedChanges: {},
      });

      act(() => {
        screen.getByTestId('comboBoxSearchInput').click();
      });

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.click(screen.getByText('Custom Connector 1'));

      expect(handleFieldChange).toHaveBeenCalledWith('genAiSettings:defaultAIConnector', {
        type: 'string',
        unsavedValue: 'custom1',
      });
    });
  });

  describe('checkbox interaction', () => {
    it('updates checkbox state when clicked', async () => {
      const { handleFieldChange, container } = setupTest({
        fields: {},
        unsavedChanges: {},
      });

      expect(container.querySelector('[class$="square-unselected"]')).not.toBeNull();

      await userEvent.click(screen.getByTestId('defaultAiConnectorCheckbox'));

      expect(handleFieldChange).toHaveBeenCalledWith('genAiSettings:defaultAIConnectorOnly', {
        type: 'boolean',
        unsavedValue: true,
      });
    });
  });
});
