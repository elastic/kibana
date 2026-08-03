/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TeamsActionFields from './teams_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

describe('TeamsActionFields renders', () => {
  test('all connector fields are rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'https://test.com',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'teams',
      config: {},
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <TeamsActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    const teamsWebhookUrlInput = screen.getByTestId('teamsWebhookUrlInput') as HTMLInputElement;
    expect(teamsWebhookUrlInput).toBeInTheDocument();
    expect(teamsWebhookUrlInput).toHaveValue('https://test.com');
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        secrets: {
          webhookUrl: 'https://test.com',
        },
        id: 'teams',
        actionTypeId: '.teams',
        name: 'teams',
        config: {},
        isDeprecated: false,
      };

      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TeamsActionFields
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
              webhookUrl: 'https://test.com',
            },
            id: 'teams',
            actionTypeId: '.teams',
            name: 'teams',
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it('validates teh web hook url field correctly', async () => {
      const actionConnector = {
        secrets: {
          webhookUrl: 'https://test.com',
        },
        id: 'test',
        actionTypeId: '.teams',
        name: 'teams',
        config: {},
        isDeprecated: false,
      };

      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <TeamsActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      const teamsWebhookUrlInput = screen.getByTestId('teamsWebhookUrlInput');
      await userEvent.clear(teamsWebhookUrlInput);
      await userEvent.type(teamsWebhookUrlInput, 'no - valid', {
        delay: 10,
      });

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });
  });
});
