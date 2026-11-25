/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RootlyAlertsActionConnectorFields } from './rootly_alerts_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

const webhookUrl = 'https://rootly.example.com/webhooks/incoming/generic_webhooks';

const getConnector = (config: { webhookUrl: string }, secrets: { secret: string }) => ({
  config,
  secrets,
  id: 'rootly-alerts',
  actionTypeId: '.rootly_alerts',
  name: 'rootly-alerts',
  isDeprecated: false,
});

describe('RootlyAlertsActionConnectorFields renders', () => {
  test('all connector fields are rendered', () => {
    render(
      <ConnectorFormTestProvider connector={getConnector({ webhookUrl }, { secret: 'abc' })}>
        <RootlyAlertsActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('rootlyAlertsWebhookUrlInput')).toHaveValue(webhookUrl);
    expect(screen.getByTestId('rootlyAlertsSecretInput')).toHaveValue('abc');
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    const submit = async (config: { webhookUrl: string }, secrets: { secret: string }) => {
      render(
        <ConnectorFormTestProvider connector={getConnector(config, secrets)} onSubmit={onSubmit}>
          <RootlyAlertsActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );
      await userEvent.click(screen.getByTestId('form-test-provide-submit'));
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds for values at the limit of the server', async () => {
      const config = { webhookUrl: `${webhookUrl}/`.padEnd(2048, 'a') };
      const secrets = { secret: 'a'.repeat(1024) };
      await submit(config, secrets);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: getConnector(config, secrets),
          isValid: true,
        });
      });
    });

    it('connector validation succeeds when connector config is valid', async () => {
      await submit({ webhookUrl }, { secret: 'abc' });

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: getConnector({ webhookUrl }, { secret: 'abc' }),
          isValid: true,
        });
      });
    });

    it.each([
      ['the webhook URL is not a URL', { webhookUrl: 'not a url' }, { secret: 'abc' }],
      [
        'the webhook URL includes the secret',
        { webhookUrl: `${webhookUrl}?secret=abc` },
        { secret: 'abc' },
      ],
      ['the secret is empty', { webhookUrl }, { secret: '' }],
      [
        'the webhook URL is over the limit of the server',
        { webhookUrl: `${webhookUrl}/`.padEnd(2049, 'a') },
        { secret: 'abc' },
      ],
      ['the secret is over the limit of the server', { webhookUrl }, { secret: 'a'.repeat(1025) }],
    ])('connector validation fails when %s', async (_name, config, secrets) => {
      await submit(config, secrets);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });
  });
});
