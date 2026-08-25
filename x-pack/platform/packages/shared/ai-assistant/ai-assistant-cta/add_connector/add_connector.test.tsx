/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import { AddConnector, type AddConnectorProps } from './add_connector';
import { translations } from './add_connector.translations';

describe('AddConnector', () => {
  const onAddConnector = jest.fn();

  const renderComponent = (props: AddConnectorProps) =>
    render(<AddConnector {...props} />, { wrapper: EuiThemeProvider });

  it('renders the component with the correct button and description', () => {
    renderComponent({ onAddConnector });

    expect(screen.queryByText(translations.addButton)).toBeInTheDocument();
    expect(screen.queryByText(translations.description)).toBeInTheDocument();
  });

  it('calls onAddConnector when the button is clicked', () => {
    const { getByText } = renderComponent({ onAddConnector });

    fireEvent.click(getByText(translations.addButton));
    expect(onAddConnector).toHaveBeenCalled();
  });
});
