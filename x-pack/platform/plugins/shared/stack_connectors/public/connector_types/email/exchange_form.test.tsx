/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ExchangeFormFields from './exchange_form';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

describe('ExchangeFormFields renders', () => {
  const actionConnector = createMockActionConnector({
    secrets: {
      clientSecret: 'secret',
    },
    id: 'email',
    actionTypeId: '.email',
    name: 'email',
    isDeprecated: false,
    config: {
      from: 'test@test.com',
      service: 'exchange_server',
      tenantId: 'tenant-id',
      clientId: 'clientId-id',
    },
  });

  test('should display exchange form fields', () => {
    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <ExchangeFormFields readOnly={false} />
      </ConnectorFormTestProvider>
    );
    expect(screen.getByTestId('emailClientSecret')).toBeInTheDocument();
    expect(screen.getByTestId('emailClientId')).toBeInTheDocument();
    expect(screen.getByTestId('emailTenantId')).toBeInTheDocument();
  });

  test('exchange field defaults to empty when not defined', () => {
    const connector = {
      ...actionConnector,
      secrets: {},
      config: {
        from: 'test@test.com',
      },
    };

    render(
      <ConnectorFormTestProvider connector={connector}>
        <ExchangeFormFields readOnly={false} />
      </ConnectorFormTestProvider>
    );
    expect(screen.getByTestId('emailClientSecret')).toBeInTheDocument();
    expect(screen.getByTestId('emailClientSecret')).toHaveValue('');

    expect(screen.getByTestId('emailClientId')).toBeInTheDocument();
    expect(screen.getByTestId('emailClientId')).toHaveValue('');

    expect(screen.getByTestId('emailTenantId')).toBeInTheDocument();
    expect(screen.getByTestId('emailTenantId')).toHaveValue('');
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['emailTenantId', ''],
      ['emailClientId', ''],
      ['emailClientSecret', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <ExchangeFormFields readOnly={false} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledWith({
          data: {
            secrets: {
              clientSecret: 'secret',
            },
            id: 'email',
            actionTypeId: '.email',
            name: 'email',
            isDeprecated: false,
            config: {
              tenantId: 'tenant-id',
              clientId: 'clientId-id',
            },
          },
          isValid: true,
        });
      });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <ExchangeFormFields readOnly={false} />
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
