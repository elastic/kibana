/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ResilientConnectorFields from './resilient_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

describe('ResilientActionConnectorFields renders', () => {
  test('alerting Resilient connector fields are rendered', () => {
    const actionConnector = {
      actionTypeId: '.resilient',
      name: 'resilient',
      config: {
        apiUrl: 'https://test.com',
        orgId: '201',
      },
      secrets: {
        apiKeyId: 'key',
        apiKeySecret: 'secret',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <ResilientConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.apiUrl-input')).toBeInTheDocument();
    expect(screen.getByTestId('config.orgId-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.apiKeyId-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.apiKeySecret-input')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['config.apiUrl-input', 'not-valid'],
      ['config.orgId-input', ''],
      ['secrets.apiKeyId-input', ''],
      ['secrets.apiKeySecret-input', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const actionConnector = {
        actionTypeId: '.resilient',
        name: 'resilient',
        config: {
          apiUrl: 'https://test.com',
          orgId: '201',
        },
        secrets: {
          apiKeyId: 'key',
          apiKeySecret: 'secret',
        },
        isDeprecated: false,
      };

      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <ResilientConnectorFields
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
            actionTypeId: '.resilient',
            name: 'resilient',
            config: {
              apiUrl: 'https://test.com',
              orgId: '201',
            },
            id: 'resilient',
            secrets: {
              apiKeyId: 'key',
              apiKeySecret: 'secret',
            },
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      const actionConnector = {
        actionTypeId: '.resilient',
        name: 'resilient',
        config: {
          apiUrl: 'https://test.com',
          orgId: '201',
        },
        secrets: {
          apiKeyId: 'key',
          apiKeySecret: 'secret',
        },
        isDeprecated: false,
      };

      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <ResilientConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(res.getByTestId(field));
      if (value !== '') {
        await userEvent.type(res.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });
  });
});
