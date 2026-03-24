/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, render, screen } from '@testing-library/react';

import type { ConnectorSelectableFooterProps } from './connector_selectable_footer';
import { ConnectorSelectableFooter } from './connector_selectable_footer';

describe('ConnectorSelectableFooter', () => {
  const renderComponent = (props: ConnectorSelectableFooterProps) =>
    render(<ConnectorSelectableFooter {...props} />, { wrapper: EuiThemeProvider });

  const onAddConnectorClick = jest.fn();
  const onManageConnectorsClick = jest.fn();

  const defaultProps: ConnectorSelectableFooterProps = {
    onAddConnectorClick,
    onManageConnectorsClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing if add or manage actions are not provided', async () => {
    renderComponent({
      onAddConnectorClick: undefined,
      onManageConnectorsClick: undefined,
    });

    expect(screen.queryByTestId('aiAssistantAddConnectorButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).not.toBeInTheDocument();
  });

  it('renders panel without manage connectors button', async () => {
    renderComponent({
      ...defaultProps,
      onManageConnectorsClick: undefined,
    });

    expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aiAssistantAddConnectorButton')).toBeInTheDocument();
  });

  it('renders panel without add connectors button', async () => {
    renderComponent({
      ...defaultProps,
      onAddConnectorClick: undefined,
    });

    expect(screen.queryByTestId('aiAssistantManageConnectorsButton')).toBeInTheDocument();
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
