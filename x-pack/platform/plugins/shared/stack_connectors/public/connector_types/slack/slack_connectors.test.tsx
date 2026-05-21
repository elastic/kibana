/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SlackActionFields from './slack_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http://test.com',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    const slackWebhookUrlInput = screen.getByTestId('slackWebhookUrlInput') as HTMLInputElement;
    expect(slackWebhookUrlInput).toBeInTheDocument();
    expect(slackWebhookUrlInput).toHaveValue('http://test.com');
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        secrets: {
          webhookUrl: 'http://test.com',
        },
        id: 'slack',
        actionTypeId: '.slack',
        name: 'slack',
        config: {},
        isDeprecated: false,
      };

      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            secrets: {
              webhookUrl: 'http://test.com',
            },
            id: 'slack',
            actionTypeId: '.slack',
            name: 'slack',
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it('validates the web hook url field correctly', async () => {
      const actionConnector = {
        secrets: {
          webhookUrl: 'http://test.com',
        },
        id: 'test',
        actionTypeId: '.slack',
        name: 'slack',
        config: {},
        isDeprecated: false,
      };

      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const slackWebhookUrlInput = screen.getByTestId('slackWebhookUrlInput');
      await userEvent.clear(slackWebhookUrlInput);
      await userEvent.type(slackWebhookUrlInput, 'no-valid', {
        delay: 10,
      });

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });
  });
});
