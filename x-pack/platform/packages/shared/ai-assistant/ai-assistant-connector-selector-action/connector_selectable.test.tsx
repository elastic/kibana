/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, render, screen } from '@testing-library/react';

import { translations } from './connector_selector.translations';
import type { ConnectorSelectableProps } from './connector_selectable';
import { ConnectorSelectable } from './connector_selectable';

describe('ConnectorSelectable', () => {
  const renderComponent = (props: ConnectorSelectableProps) =>
    render(<ConnectorSelectable {...props} />, { wrapper: EuiThemeProvider });

  const onValueChange = jest.fn();
  const onAddConnectorClick = jest.fn();
  const onManageConnectorsClick = jest.fn();

  const defaultProps: ConnectorSelectableProps = {
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
      expect(screen.queryByText(connector.label)).toBeInTheDocument();
      expect(connector['data-test-subj']).toBeDefined();
      expect(screen.queryByTestId(connector['data-test-subj']!)).toBeInTheDocument();
    });

    expect(allConnectors.length).toBe(6);

    expect(screen.queryByTestId('aiAssistantAddConnectorButton')).toBeInTheDocument();
    expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).toBeInTheDocument();
    expect(screen.queryByText(translations.addConnectorLabel)).toBeInTheDocument();
  });

  it('renders panel without manage connectors button and add connectors button', async () => {
    renderComponent({
      ...defaultProps,
      onManageConnectorsClick: undefined,
      onAddConnectorClick: undefined,
    });

    expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aiAssistantAddConnectorButton')).not.toBeInTheDocument();
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
});
