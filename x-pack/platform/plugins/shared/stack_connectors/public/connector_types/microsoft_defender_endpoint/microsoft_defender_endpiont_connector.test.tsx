/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ConnectorFormTestProvider, createAppMockRenderer } from '../lib/test_utils';
import MicrosoftDefenderEndpointActionConnectorFields from './microsoft_defender_endpoint_connector';
import { ActionConnectorFieldsProps } from '@kbn/alerts-ui-shared';
import { MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID } from '../../../common/microsoft_defender_endpoint/constants';
import { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';

describe('Microsoft Defender for Endpoint Connector UI', () => {
  let renderProps: ActionConnectorFieldsProps;
  let connectorFormProps: ConnectorFormSchema;

  beforeEach(() => {
    renderProps = {
      readOnly: false,
      isEdit: false,
      registerPreSubmitValidator: jest.fn(),
    };
    connectorFormProps = {
      id: 'test',
      name: 'email',
      isDeprecated: false,
      actionTypeId: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
      secrets: {
        clientSecret: 'shhhh',
      },
      config: {
        clientId: 'client-a',
        tenantId: 'tenant-1',
        oAuthServerUrl: 'https://t_e_s_t.com',
        oAuthScope: 'some-scope',
        apiUrl: 'https://api.t_e_s_t.com',
      },
    };
  });

  it.each([
    'config.clientId',
    'config.tenantId',
    'config.oAuthServerUrl',
    'config.oAuthScope',
    'config.apiUrl',
    'secrets.clientSecret',
  ])('should display input for setting: %s', (field: string) => {
    const appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <ConnectorFormTestProvider connector={connectorFormProps}>
        <MicrosoftDefenderEndpointActionConnectorFields {...renderProps} />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId(`${field}-input`)).not.toBeNull();
  });

  it.each(['config.oAuthServerUrl', 'config.oAuthScope', 'config.apiUrl'])(
    'should include default value for field: %s',
    (field: string) => {
      const appMockRenderer = createAppMockRenderer();
      appMockRenderer.render(
        <ConnectorFormTestProvider connector={connectorFormProps}>
          <MicrosoftDefenderEndpointActionConnectorFields {...renderProps} />
        </ConnectorFormTestProvider>
      );

      expect(screen.getByTestId(`${field}-input`)).toHaveValue();
    }
  );
});
