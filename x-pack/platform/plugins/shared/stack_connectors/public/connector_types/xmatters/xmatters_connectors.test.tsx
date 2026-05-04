/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import XmattersActionConnectorFields from './xmatters_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('XmattersActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'https://test.com',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.configUrl')).toBeInTheDocument();
    expect(screen.getByTestId('xmattersUserInput')).toBeInTheDocument();
    expect(screen.getByTestId('xmattersPasswordInput')).toBeInTheDocument();
  });

  test('should show only basic auth info when basic selected', () => {
    const actionConnector = {
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'https://test.com',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.configUrl')).toBeInTheDocument();
    expect(screen.getByTestId('xmattersUserInput')).toBeInTheDocument();
    expect(screen.getByTestId('xmattersPasswordInput')).toBeInTheDocument();
  });

  test('should show only url auth info when url selected', () => {
    const actionConnector = {
      secrets: {
        secretsUrl: 'https://test.com',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        usesBasic: false,
      },
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('secrets.secretsUrl')).toBeInTheDocument();
    expect(screen.queryByTestId('xmattersUserInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('xmattersPasswordInput')).not.toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const basicAuthConnector = {
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'https://test.com',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    const urlAuthConnector = {
      ...basicAuthConnector,
      config: {
        usesBasic: false,
      },
      secrets: {
        secretsUrl: 'https://test.com',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const basicAuthTests: Array<[string, string]> = [
      ['config.configUrl', 'not-valid'],
      ['xmattersUserInput', ''],
      ['xmattersPasswordInput', ''],
    ];

    const urlAuthTests: Array<[string, string]> = [['secrets.secretsUrl', 'not-valid']];

    it('connector validation succeeds when connector config is valid and uses basic auth', async () => {
      render(
        <ConnectorFormTestProvider connector={basicAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
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
            actionTypeId: '.xmatters',
            name: 'xmatters',
            config: {
              configUrl: 'https://test.com',
              usesBasic: true,
            },
            secrets: {
              user: 'user',
              password: 'pass',
            },
            __internal__: {
              auth: 'Basic Authentication',
            },
            isDeprecated: false,
            id: 'xmatters',
          },
          isValid: true,
        });
      });
    });

    it('connector validation succeeds when connector config is valid and uses url auth', async () => {
      render(
        <ConnectorFormTestProvider connector={urlAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
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
            actionTypeId: '.xmatters',
            name: 'xmatters',
            config: {
              usesBasic: false,
            },
            secrets: {
              secretsUrl: 'https://test.com',
            },
            __internal__: { auth: 'URL Authentication' },
            isDeprecated: false,
            id: 'xmatters',
          },
          isValid: true,
        });
      });
    });

    it.each(basicAuthTests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={basicAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
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

    it.each(urlAuthTests)('validates correctly %p', async (field, value) => {
      const res = render(
        <ConnectorFormTestProvider connector={urlAuthConnector} onSubmit={onSubmit}>
          <XmattersActionConnectorFields
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
