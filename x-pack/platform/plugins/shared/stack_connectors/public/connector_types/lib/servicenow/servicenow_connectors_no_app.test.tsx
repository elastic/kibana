/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import React from 'react';
import { AppMockRenderer, ConnectorFormTestProvider, createAppMockRenderer } from '../test_utils';
import ServiceNowConnectorFieldsNoApp from './servicenow_connectors_no_app';

describe('ServiceNowActionConnectorFields renders', () => {
  const basicAuthConnector = {
    id: 'test',
    actionTypeId: '.servicenow',
    isDeprecated: true,
    name: 'SN',
    config: {
      apiUrl: 'https://test.com',
      isOAuth: false,
      usesTableApi: false,
    },
    secrets: {
      username: 'user',
      password: 'pass',
    },
  };

  const oauthConnector = {
    id: 'test',
    actionTypeId: '.servicenow',
    isDeprecated: true,
    name: 'SN',
    config: {
      apiUrl: 'https://test.com',
      isOAuth: true,
      usesTableApi: false,
      clientId: 'test-id',
      userIdentifierValue: 'email',
      jwtKeyId: 'test-id',
    },
    secrets: {
      clientSecret: 'secret',
      privateKey: 'secret-key',
      privateKeyPassword: 'secret-pass',
    },
  };

  let appMockRenderer: AppMockRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a basic auth connector', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <ConnectorFormTestProvider connector={basicAuthConnector}>
        <ServiceNowConnectorFieldsNoApp
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('credentialsApiUrlFromInput')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-username-form-input')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-password-form-input')).toBeInTheDocument();
  });

  it('renders an oauth connector', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <ConnectorFormTestProvider connector={oauthConnector}>
        <ServiceNowConnectorFieldsNoApp
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('credentialsApiUrlFromInput')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-client-id-form-input')).toBeInTheDocument();
    expect(
      screen.getByTestId('connector-servicenow-user-identifier-form-input')
    ).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-jwt-key-id-form-input')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-client-secret-form-input')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-private-key-form-input')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const basicAuthTests: Array<[string, string]> = [
      ['credentialsApiUrlFromInput', 'not-valid'],
      ['connector-servicenow-username-form-input', ''],
      ['connector-servicenow-password-form-input', ''],
    ];

    const oauthTests: Array<[string, string]> = [
      ['credentialsApiUrlFromInput', 'not-valid'],
      ['connector-servicenow-client-id-form-input', ''],
      ['connector-servicenow-user-identifier-form-input', ''],
      ['connector-servicenow-jwt-key-id-form-input', ''],
      ['connector-servicenow-client-secret-form-input', ''],
      ['connector-servicenow-private-key-form-input', ''],
    ];

    it.each(basicAuthTests)('validates correctly %p', async (field, value) => {
      appMockRenderer.render(
        <ConnectorFormTestProvider connector={basicAuthConnector} onSubmit={onSubmit}>
          <ServiceNowConnectorFieldsNoApp
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(screen.getByTestId(field));
      if (value !== '') {
        await userEvent.type(screen.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    it.each(oauthTests)('validates correctly %p', async (field, value) => {
      appMockRenderer.render(
        <ConnectorFormTestProvider connector={oauthConnector} onSubmit={onSubmit}>
          <ServiceNowConnectorFieldsNoApp
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(screen.getByTestId(field));
      if (value !== '') {
        await userEvent.type(screen.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
