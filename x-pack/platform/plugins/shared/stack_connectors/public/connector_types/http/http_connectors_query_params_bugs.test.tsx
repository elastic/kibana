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

const mockUseSecretQueryParams = jest.fn();
jest.mock('../../common/auth/use_secret_query_params', () => ({
  useSecretQueryParams: (...args: unknown[]) => mockUseSecretQueryParams(...args),
}));

const connectorWithExistingQueryParams = {
  id: 'existing-connector',
  actionTypeId: '.http',
  name: 'HTTP with query params',
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
    secretQueryParams: { apiKey: 'secret-value', token: 'secret-token' },
  },
  isDeprecated: false,
};

describe('HTTP connector query params bugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bug 1: Toggle does not work when editing an existing connector', () => {
    it('should enable the query params toggle when the connector has existing secret query params', async () => {
      mockUseSecretQueryParams.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: ['apiKey', 'token'],
      });

      render(
        <ConnectorFormTestProvider
          connector={connectorWithExistingQueryParams}
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
        expect(screen.getByTestId('httpQueryParamsSwitch')).toBeInTheDocument();
      });

      const toggle = screen.getByTestId('httpQueryParamsSwitch');

      await waitFor(() => {
        expect(toggle).toBeChecked();
      });

      await waitFor(() => {
        const keyInputs = screen.getAllByTestId('httpQueryParamKeyInput');
        expect(keyInputs).toHaveLength(2);
      });
    });
  });

  describe('Bug 2: A new query parameter shows up when editing an existing one', () => {
    it('should not add phantom query params when editing an existing param value', async () => {
      mockUseSecretQueryParams.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: ['apiKey'],
      });

      render(
        <ConnectorFormTestProvider
          connector={{
            ...connectorWithExistingQueryParams,
            secrets: {
              ...connectorWithExistingQueryParams.secrets,
              secretQueryParams: { apiKey: 'secret-value' },
            },
          }}
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
        expect(screen.getByTestId('httpQueryParamsSwitch')).toBeInTheDocument();
      });

      await waitFor(() => {
        const keyInputs = screen.getAllByTestId('httpQueryParamKeyInput');
        expect(keyInputs).toHaveLength(1);
      });

      const valueInput = screen.getByTestId('httpQueryParamValueInput');
      await userEvent.click(valueInput);
      await userEvent.type(valueInput, 'new-secret-value');

      const keyInputsAfterEdit = screen.getAllByTestId('httpQueryParamKeyInput');
      expect(keyInputsAfterEdit).toHaveLength(1);
    });
  });

  describe('Bug 3: Clicking delete reorders params instead of removing', () => {
    it('should remove the correct query param when delete is clicked', async () => {
      mockUseSecretQueryParams.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: ['apiKey', 'token'],
      });

      render(
        <ConnectorFormTestProvider
          connector={connectorWithExistingQueryParams}
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
        expect(screen.getByTestId('httpQueryParamsSwitch')).toBeInTheDocument();
      });

      await waitFor(() => {
        const keyInputs = screen.getAllByTestId('httpQueryParamKeyInput');
        expect(keyInputs).toHaveLength(2);
      });

      const deleteButtons = screen.getAllByTestId('httpRemoveQueryParamButton');
      expect(deleteButtons).toHaveLength(2);

      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        const keyInputsAfter = screen.getAllByTestId('httpQueryParamKeyInput');
        expect(keyInputsAfter).toHaveLength(1);
      });
    });
  });
});
