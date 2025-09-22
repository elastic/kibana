/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiThemeProvider } from '@elastic/eui';
import { act, render, screen, within } from '@testing-library/react';

import type { ConnectorSelectorProps } from './connector_selector';
import { ConnectorSelector } from './connector_selector';
import { translations } from './connector_selector.translations';

describe('ConnectorSelector', () => {
  describe('Controlled', () => {
    const renderComponent = (props: ConnectorSelectorProps) =>
      render(<ConnectorSelector {...props} />, { wrapper: EuiThemeProvider });

    const onValueChange = jest.fn();
    const onAddConnectorClick = jest.fn();
    const onManageConnectorsClick = jest.fn();

    const defaultProps: ConnectorSelectorProps = {
      preConfiguredConnectors: [
        { label: 'Connector 1', value: '1', 'data-test-subj': 'connector1' },
        { label: 'Connector 2', value: '2', 'data-test-subj': 'connector2' },
        { label: 'Connector 3', value: '3', 'data-test-subj': 'connector3' },
      ],
      customConnectors: [
        { label: 'Custom Connector 1', value: '4', 'data-test-subj': 'customConnector1' },
        { label: 'Custom Connector 2', value: '5', 'data-test-subj': 'customConnector2' },
        { label: 'Custom Connector 3', value: '6', 'data-test-subj': 'customConnector3' },
      ],
      value: '3',
      onValueChange,
      onAddConnectorClick,
      onManageConnectorsClick,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders panel with pre-configured and custom connectors', async () => {
      renderComponent(defaultProps);

      expect(screen.queryByText(translations.preConfiguredConnectorLabel)).toBeInTheDocument();
      expect(screen.queryByText(translations.customConnectorLabel)).toBeInTheDocument();
      expect(screen.queryByTestId('aiAssistantConnectorSelector')).toBeInTheDocument();

      const allConnectors = [
        ...defaultProps.preConfiguredConnectors,
        ...defaultProps.customConnectors,
      ];

      allConnectors.forEach((connector) => {
        expect(connector['data-test-subj']).toBeDefined();
        expect(screen.queryByTestId(connector['data-test-subj']!)).toBeInTheDocument();
        expect(screen.queryByText(connector.label)).toBeInTheDocument();
      });

      expect(allConnectors.length).toBe(6);

      expect(screen.queryByTestId('aiAssistantAddConnectorButton')).toBeInTheDocument();
      expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).toBeInTheDocument();
      expect(screen.queryByText(translations.addConnectorLabel)).toBeInTheDocument();
    });

    it('renders panel with pre-configured connectors', async () => {
      renderComponent({
        ...defaultProps,
        customConnectors: [],
      });

      expect(screen.queryByText(translations.preConfiguredConnectorLabel)).toBeInTheDocument();
      expect(screen.queryByText(translations.customConnectorLabel)).not.toBeInTheDocument();
      expect(screen.queryByTestId('aiAssistantConnectorSelector')).toBeInTheDocument();

      defaultProps.preConfiguredConnectors.forEach((connector) => {
        expect(connector['data-test-subj']).toBeDefined();
        expect(screen.queryByTestId(connector['data-test-subj']!)).toBeInTheDocument();
        expect(screen.queryByText(connector.label)).toBeInTheDocument();
      });
    });

    it('renders panel with custom connectors', async () => {
      renderComponent({
        ...defaultProps,
        preConfiguredConnectors: [],
      });

      expect(screen.queryByText(translations.preConfiguredConnectorLabel)).not.toBeInTheDocument();
      expect(screen.queryByText(translations.customConnectorLabel)).toBeInTheDocument();
      expect(screen.queryByTestId('aiAssistantConnectorSelector')).toBeInTheDocument();

      defaultProps.customConnectors.forEach((connector) => {
        expect(connector['data-test-subj']).toBeDefined();
        expect(screen.queryByTestId(connector['data-test-subj']!)).toBeInTheDocument();
        expect(screen.queryByText(connector.label)).toBeInTheDocument();
      });
    });

    it('renders panel without manage connectors button', async () => {
      renderComponent({
        ...defaultProps,
        onManageConnectorsClick: undefined,
      });

      expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).not.toBeInTheDocument();
    });

    it('renders default connector badge when connector is pre-configured', async () => {
      renderComponent({
        ...defaultProps,
        defaultConnectorId: '1',
      });

      const connector1 = screen.queryByTestId('connector1');
      const defaultConnectorBadge = within(connector1!).getByTestId('defaultConnectorBadge');
      expect(defaultConnectorBadge).toBeInTheDocument();
      expect(defaultConnectorBadge).toHaveTextContent(translations.defaultConnectorLabel);
    });

    it('renders default connector badge when connector is custom', async () => {
      renderComponent({
        ...defaultProps,
        defaultConnectorId: '6',
      });

      const connector6 = screen.queryByTestId('customConnector3');
      const defaultConnectorBadge = within(connector6!).getByTestId('defaultConnectorBadge');
      expect(defaultConnectorBadge).toBeInTheDocument();
      expect(defaultConnectorBadge).toHaveTextContent(translations.defaultConnectorLabel);
    });

    it('does not renders default connector badge when connector does not match default connector id', async () => {
      renderComponent({
        ...defaultProps,
        defaultConnectorId: '7',
      });

      const defaultConnectorBadge = screen.queryByTestId('defaultConnectorBadge');
      expect(defaultConnectorBadge).not.toBeInTheDocument();
    });

    it('renders panel without add connectors button', async () => {
      renderComponent({
        ...defaultProps,
        onAddConnectorClick: undefined,
      });

      expect(screen.queryByTestId('aiAssistantAddConnectorButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).toBeInTheDocument();
      expect(screen.queryByText(translations.addConnectorLabel)).not.toBeInTheDocument();
    });

    it('renders panel with custom add connectors button label', async () => {
      renderComponent({
        ...defaultProps,
        addConnectorLabel: 'New Connector',
      });

      expect(screen.queryByTestId('aiAssistantAddConnectorButton')).toBeInTheDocument();
      expect(screen.queryByText('New Connector')).toBeInTheDocument();
    });

    it('onClick callback for add connector button', async () => {
      renderComponent(defaultProps);

      act(() => screen.queryByTestId('aiAssistantAddConnectorButton')?.click());

      expect(onAddConnectorClick).toHaveBeenCalledTimes(1);
    });

    it('onClick callback for manage connector button', async () => {
      renderComponent(defaultProps);

      act(() => screen.queryByTestId('aiAssistantManageConnectorsButton')?.click());

      expect(onManageConnectorsClick).toHaveBeenCalledTimes(1);
    });

    it('renders panel with correct initial selection', async () => {
      renderComponent(defaultProps);

      expect(screen.queryByTestId('connector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('connector2')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('connector3')).toHaveAttribute('aria-checked', 'true');
      expect(screen.queryByTestId('customConnector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector2')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector3')).toHaveAttribute('aria-checked', 'false');
    });

    it('renders panel with correct selection change', async () => {
      const ControlledWrapper = (props: ConnectorSelectorProps) => {
        const [value, setValue] = React.useState<string>(String(props.value));
        const handleValueChange = (val: string, option: EuiSelectableOption) => {
          setValue(String(val));
          onValueChange(val, option);
        };
        return <ConnectorSelector {...props} value={value} onValueChange={handleValueChange} />;
      };

      render(<ControlledWrapper {...defaultProps} />, { wrapper: EuiThemeProvider });

      act(() => screen.queryByTestId('connector1')?.click());

      expect(screen.queryByTestId('connector1')).toHaveAttribute('aria-checked', 'true');
      expect(screen.queryByTestId('connector2')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('connector3')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector2')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector3')).toHaveAttribute('aria-checked', 'false');

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ label: 'Connector 1', value: '1' })
      );
    });
  });

  describe('Uncontrolled', () => {
    const renderComponent = (props: ConnectorSelectorProps) =>
      render(<ConnectorSelector {...props} />, { wrapper: EuiThemeProvider });

    const onValueChange = jest.fn();

    const baseProps: ConnectorSelectorProps = {
      preConfiguredConnectors: [
        { label: 'Connector 1', value: '1', 'data-test-subj': 'connector1' },
        { label: 'Connector 2', value: '2', 'data-test-subj': 'connector2' },
      ],
      customConnectors: [
        { label: 'Custom Connector 1', value: '4', 'data-test-subj': 'customConnector1' },
        { label: 'Custom Connector 2', value: '5', 'data-test-subj': 'customConnector2' },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('sets initial selection from defaultValue without firing callbacks', () => {
      renderComponent({ ...baseProps, defaultValue: '2', onValueChange });

      expect(screen.queryByTestId('connector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('connector2')).toHaveAttribute('aria-checked', 'true');
      expect(screen.queryByTestId('customConnector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector2')).toHaveAttribute('aria-checked', 'false');

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('has no initial selection when defaultValue is not provided', () => {
      renderComponent({ ...baseProps });

      expect(screen.queryByTestId('connector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('connector2')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('customConnector2')).toHaveAttribute('aria-checked', 'false');
    });

    it('updates selection and fires callbacks on user change', () => {
      renderComponent({ ...baseProps, defaultValue: '1', onValueChange });

      act(() => screen.queryByTestId('connector2')?.click());

      expect(screen.queryByTestId('connector1')).toHaveAttribute('aria-checked', 'false');
      expect(screen.queryByTestId('connector2')).toHaveAttribute('aria-checked', 'true');

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({ label: 'Connector 2', value: '2' })
      );
    });
  });
});
