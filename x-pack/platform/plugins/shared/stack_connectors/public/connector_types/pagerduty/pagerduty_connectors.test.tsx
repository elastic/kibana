/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PagerDutyActionConnectorFields from './pagerduty_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';
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

describe('PagerDutyActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        routingKey: 'test',
      },
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http://test.com',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <PagerDutyActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    const pagerdutyApiUrlInput = screen.getByTestId('pagerdutyApiUrlInput') as HTMLInputElement;
    expect(pagerdutyApiUrlInput).toBeInTheDocument();
    expect(pagerdutyApiUrlInput).toHaveValue('http://test.com');
    expect(screen.getByTestId('pagerdutyRoutingKeyInput')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        secrets: {
          routingKey: 'test',
        },
        id: 'pagerduty',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: 'http://test.com',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            secrets: {
              routingKey: 'test',
            },
            id: 'pagerduty',
            actionTypeId: '.pagerduty',
            name: 'pagerduty',
            config: {
              apiUrl: 'http://test.com',
            },
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it('validates correctly if the apiUrl is empty', async () => {
      const actionConnector = {
        secrets: {
          routingKey: 'test',
        },
        id: 'pagerduty',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: '',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            secrets: {
              routingKey: 'test',
            },
            id: 'pagerduty',
            actionTypeId: '.pagerduty',
            name: 'pagerduty',
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it('validates correctly if the apiUrl is not empty and not a valid url', async () => {
      const actionConnector = {
        secrets: {
          routingKey: 'test',
        },
        id: 'test',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: 'not-valid',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    it('validates correctly the routingKey', async () => {
      const actionConnector = {
        secrets: {
          routingKey: '',
        },
        id: 'test',
        actionTypeId: '.pagerduty',
        name: 'pagerduty',
        config: {
          apiUrl: 'not-valid',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <PagerDutyActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {},
          isValid: false,
        });
      });
    });
  });
});
