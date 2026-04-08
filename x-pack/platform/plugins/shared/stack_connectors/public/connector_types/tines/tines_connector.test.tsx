/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CONNECTOR_ID, CONNECTOR_NAME } from '@kbn/connector-schemas/tines/constants';
import TinesConnectorFields from './tines_connector';

const url = 'https://example.com';
const email = 'some.email@test.com';
const token = '123';

const actionConnector = {
  actionTypeId: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  config: { url },
  secrets: { email, token },
  isDeprecated: false,
};

describe('TinesConnectorFields renders', () => {
  it('should render all fields', async () => {
    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <TinesConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.url-input')).toBeInTheDocument();
    expect((screen.getByTestId('config.url-input') as HTMLInputElement).value).toBe(url);
    expect(screen.getByTestId('secrets.email-input')).toBeInTheDocument();
    expect((screen.getByTestId('secrets.email-input') as HTMLInputElement).value).toBe(email);
    expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should succeed validation when connector config is valid', async () => {
      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: actionConnector,
        isValid: true,
      });
    });

    it('should fail validation when connector secrets are empty', async () => {
      const connector = {
        ...actionConnector,
        secrets: {},
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('should fail validation when connector url is empty', async () => {
      const connector = {
        ...actionConnector,
        config: { url: '' },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });

    it('should fail validation when connector url is invalid', async () => {
      const connector = {
        ...actionConnector,
        config: { url: 'not a url' },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TinesConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {},
        isValid: false,
      });
    });
  });
});
