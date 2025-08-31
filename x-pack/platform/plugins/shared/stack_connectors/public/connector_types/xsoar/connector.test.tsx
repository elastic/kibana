/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import XSOARConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('XSOARActionConnectorFields renders', () => {
  const actionConnector = {
    actionTypeId: '.xsoar',
    name: 'XSOAR',
    config: {
      url: 'https://test.com',
    },
    secrets: {
      apiKey: 'apiKey',
    },
    isDeprecated: false,
  };

  it('XSOAR connector fields are rendered', () => {
    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <XSOARConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('config.url-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.apiKey-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.apiKeyID-input')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['config.url-input', 'not-valid'],
      ['secrets.apiKey-input', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <XSOARConnectorFields
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
            actionTypeId: '.xsoar',
            name: 'XSOAR',
            config: {
              url: 'https://test.com',
            },
            secrets: {
              apiKey: 'apiKey',
            },
            isDeprecated: false,
          },
          isValid: true,
        });
      });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      render(
        <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
          <XSOARConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(screen.getByTestId(field));
      if (value !== '') {
        await userEvent.type(screen.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
