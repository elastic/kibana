/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Credentials } from './credentials';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConnectorFormTestProvider } from '../test_utils';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('Credentials', () => {
  const connector = {
    id: 'test',
    actionTypeId: '.servicenow',
    isPreconfigured: false,
    isDeprecated: true,
    name: 'SN',
    config: {},
    secrets: {},
  };

  it('renders basic auth form', async () => {
    render(
      <ConnectorFormTestProvider connector={connector}>
        <IntlProvider locale="en">
          <Credentials isOAuth={false} readOnly={false} isLoading={false} />
        </IntlProvider>
      </ConnectorFormTestProvider>
    );
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect((await screen.findByRole('switch')).getAttribute('aria-checked')).toEqual('false');
    expect(screen.getByLabelText('ServiceNow instance URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('User identifier')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('JWT verifier key ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Client secret')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Private key')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Private key password')).not.toBeInTheDocument();
  });

  it('switches to oauth form', async () => {
    render(
      <ConnectorFormTestProvider connector={connector}>
        <IntlProvider locale="en">
          <Credentials isOAuth={true} readOnly={false} isLoading={false} />
        </IntlProvider>
      </ConnectorFormTestProvider>
    );

    fireEvent.click(screen.getByRole('switch'));

    expect((await screen.findByRole('switch')).getAttribute('aria-checked')).toEqual('true');

    expect(screen.getByLabelText('ServiceNow instance URL')).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();
    expect(screen.getByLabelText('User identifier')).toBeInTheDocument();
    expect(screen.getByLabelText('JWT verifier key ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Client secret')).toBeInTheDocument();
    expect(screen.getByLabelText('Private key')).toBeInTheDocument();
    expect(screen.getByLabelText('Private key password')).toBeInTheDocument();
  });
});
