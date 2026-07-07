/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import TorqActionConnectorFields from './torq_connectors';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';

const mockUseKibanaReturnValue = createStartServicesMock();

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

const EMPTY_FUNC = () => {};

describe('TorqActionConnectorFields renders', () => {
  test('all connector fields are rendered', async () => {
    const actionConnector = {
      actionTypeId: '.torq',
      name: 'torq',
      config: {
        webhookIntegrationUrl: 'https://hooks.torq.io/v1/webhooks/fjdkljfekdfjlsa',
      },
      secrets: {
        token: 'testtoken',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <TorqActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={EMPTY_FUNC}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('torqUrlText')).toBeInTheDocument();
    expect(screen.getByTestId('torqTokenInput')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const actionConnector = {
      actionTypeId: '.torq',
      name: 'torq',
      config: {
        webhookIntegrationUrl: 'https://hooks.torq.io/v1/webhooks/fjdksla',
      },
      secrets: {
        token: 'testtoken',
      },
      isDeprecated: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TorqActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={EMPTY_FUNC}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.torq',
            name: 'torq',
            config: {
              webhookIntegrationUrl: 'https://hooks.torq.io/v1/webhooks/fjdksla',
            },
            secrets: {
              token: 'testtoken',
            },
            isDeprecated: false,
            id: 'torq',
          },
          isValid: true,
        });
      });
    });

    it('connector validation succeeds when using a EU torq webhook URL', async () => {
      const connector = {
        ...actionConnector,
        config: { webhookIntegrationUrl: 'https://hooks.eu.torq.io/v1/webhooks/fjdksla' },
      };
      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TorqActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={EMPTY_FUNC}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            actionTypeId: '.torq',
            name: 'torq',
            config: {
              webhookIntegrationUrl: 'https://hooks.eu.torq.io/v1/webhooks/fjdksla',
            },
            secrets: {
              token: 'testtoken',
            },
            isDeprecated: false,
            id: 'torq',
          },
          isValid: true,
        });
      });
    });

    it('connector validation fails when there is no token', async () => {
      const connector = {
        ...actionConnector,
        secrets: {
          token: '',
        },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TorqActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={EMPTY_FUNC}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    it('connector validation fails when there is no webhook URL', async () => {
      const connector = {
        ...actionConnector,
        config: {
          webhookIntegrationUrl: '',
        },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TorqActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={EMPTY_FUNC}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    it('connector validation fails if the URL is not of a Torq webhook', async () => {
      const connector = {
        ...actionConnector,
        config: {
          webhookIntegrationUrl: 'https://hooks.not-torq.io/v1/webhooks/fjdksla',
        },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <TorqActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={EMPTY_FUNC}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });
    });
  });
});
