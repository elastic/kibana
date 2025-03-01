/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { ReadOnlyConnectorMessage } from './read_only';
import { ActionTypeModel } from '../../../..';

const ExtraComponent = jest.fn(() => (
  <div>Extra Component</div>
)) as unknown as ActionTypeModel['actionReadOnlyExtraComponent'];
describe('ReadOnlyConnectorMessage', () => {
  it('should render a readonly message with a link to the provided href', () => {
    render(
      <ReadOnlyConnectorMessage
        connectorId="123"
        connectorName="Test Connector"
        href="https://example.com/"
      />,
      { wrapper: I18nProvider }
    );

    expect(screen.getByText('This connector is read-only.')).toBeInTheDocument();
    expect(screen.getByTestId('read-only-link')).toHaveProperty('href', 'https://example.com/');
    expect(screen.queryByText('Extra Component')).toBeNull();
  });

  it('should render an extra component if provided', () => {
    render(
      <ReadOnlyConnectorMessage
        connectorId="123"
        connectorName="Test Connector"
        extraComponent={ExtraComponent}
        href="https://example.com"
      />,
      { wrapper: I18nProvider }
    );

    expect(screen.getByText('Extra Component')).toBeInTheDocument();
  });
});
