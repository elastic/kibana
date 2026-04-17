/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HttpActionConnectorFields from './http_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { formSerializer, formDeserializer } from '../lib/http/form_serialization';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

jest.mock('../../common/auth/auth_config', () => ({
  __esModule: true,
  default: () => <div data-test-subj="authConfigMock">Auth</div>,
}));

describe('HttpActionConnectorFields', () => {
  const connector = {
    id: 'test',
    actionTypeId: '.http',
    name: 'HTTP',
    config: {
      url: 'https://example.com/api',
      hasAuth: true,
      authType: 'webhook-authentication-basic',
      headers: null,
    },
    secrets: {
      user: null,
      password: null,
      crt: null,
      key: null,
      pfx: null,
      clientSecret: null,
      secretHeaders: null,
    },
    isDeprecated: false,
  };

  it('renders base URL field and proxy switch', async () => {
    render(
      <ConnectorFormTestProvider
        connector={connector}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <HttpActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={jest.fn()}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('httpUrlText')).toBeInTheDocument();
    });

    expect(screen.getByTestId('httpProxySwitch')).toBeInTheDocument();
  });

  it('renders proxy fields when proxy switch is toggled on', async () => {
    render(
      <ConnectorFormTestProvider
        connector={connector}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <HttpActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={jest.fn()}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('httpProxySwitch')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('httpProxySwitch'));

    await waitFor(() => {
      expect(screen.getByTestId('httpProxyUrlText')).toBeInTheDocument();
    });
    expect(screen.getByTestId('httpProxyVerificationModeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('proxyAuthNone')).toBeInTheDocument();
    expect(screen.getByTestId('proxyAuthBasic')).toBeInTheDocument();
  });

  it('renders proxy username/password fields when Basic auth is selected', async () => {
    render(
      <ConnectorFormTestProvider
        connector={connector}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <HttpActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={jest.fn()}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('httpProxySwitch')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('httpProxySwitch'));

    await waitFor(() => {
      expect(screen.getByTestId('proxyAuthBasic')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('proxyAuthBasic'));

    await waitFor(() => {
      expect(screen.getByTestId('httpProxyUsernameInput')).toBeInTheDocument();
    });
    expect(screen.getByTestId('httpProxyPasswordInput')).toBeInTheDocument();
  });

  it('shows proxy section when editing connector with proxyUrl', async () => {
    const connectorWithProxy = {
      ...connector,
      config: {
        ...connector.config,
        proxyUrl: 'http://proxy:8080',
        proxyVerificationMode: 'full',
        hasProxyAuth: false,
      },
    };

    render(
      <ConnectorFormTestProvider
        connector={connectorWithProxy}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <HttpActionConnectorFields
          readOnly={false}
          isEdit={true}
          registerPreSubmitValidator={jest.fn()}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('httpProxyUrlText')).toBeInTheDocument();
    });
  });
});
