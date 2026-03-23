/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';

import { ConnectorFormTestProvider } from '../lib/test_utils';
import { SlackActionFieldsComponents as SlackActionFields } from './slack_connectors';
import userEvent from '@testing-library/user-event';
import { serializer } from './form_serializer';
import { deserializer } from './form_deserializer';

const mockUseKibanaReturnValue = createStartServicesMock();

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));

describe('SlackActionFields renders', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('creating new connector', () => {
    const actionConnector = {
      secrets: {},
      config: {},
      id: 'test',
      actionTypeId: '.slack_api',
      name: 'slack',
      isDeprecated: false,
    };

    it('all connector fields is rendered for web_api type', async () => {
      render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={serializer}
          deserializer={deserializer}
        >
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
      expect(screen.getByTestId('config.allowedChannels-input')).toBeInTheDocument();
    });

    it('creates a new connector correctly', async () => {
      render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={serializer}
          deserializer={deserializer}
        >
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
      expect(screen.getByTestId('config.allowedChannels-input')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('secrets.token-input'));
      await userEvent.paste('some token');

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), '#general{enter}');

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledTimes(1);
        expect(onSubmit).toBeCalledWith({
          data: {
            ...actionConnector,
            secrets: {
              token: 'some token',
            },
            config: {
              allowedChannels: [{ name: '#general' }],
            },
          },
          isValid: true,
        });
      });
    });

    it('can create a connector without allowed channels', async () => {
      render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={serializer}
          deserializer={deserializer}
        >
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
      expect(screen.getByTestId('config.allowedChannels-input')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('secrets.token-input'));
      await userEvent.paste('some token');

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledTimes(1);
        expect(onSubmit).toBeCalledWith({
          data: {
            ...actionConnector,
            secrets: {
              token: 'some token',
            },
            config: {
              allowedChannels: [],
            },
          },
          isValid: true,
        });
      });
    });

    it('validates allowed channels correctly', async () => {
      render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={serializer}
          deserializer={deserializer}
        >
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
      expect(screen.getByTestId('config.allowedChannels-input')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('secrets.token-input'));
      await userEvent.paste('some token');

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), 'general{enter}');

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledTimes(1);
        expect(onSubmit).toBeCalledWith(expect.objectContaining({ isValid: false }));
      });
    });
  });

  describe('editing connector', () => {
    const actionConnector = {
      secrets: {
        token: 'some token',
      },
      config: { allowedChannels: [{ id: 'channel-id', name: '#test' }] },
      id: 'test',
      actionTypeId: '.slack_api',
      name: 'slack',
      isDeprecated: false,
    };

    it('renders correctly the values of the connector', async () => {
      render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={serializer}
          deserializer={deserializer}
        >
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      expect(screen.getByTestId('secrets.token-input')).toHaveValue('some token');
      expect(screen.getByText('#test')).toBeInTheDocument();
    });

    it('changes the values correctly and preserve the id of the channel', async () => {
      render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={serializer}
          deserializer={deserializer}
        >
          <SlackActionFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>
      );

      await userEvent.clear(screen.getByTestId('secrets.token-input'));
      await userEvent.click(screen.getByTestId('secrets.token-input'));
      await userEvent.paste('token updated');

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), '#new-channel{enter}');

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toBeCalledTimes(1);
        expect(onSubmit).toBeCalledWith({
          data: {
            ...actionConnector,
            secrets: {
              token: 'token updated',
            },
            config: {
              allowedChannels: [{ id: 'channel-id', name: '#test' }, { name: '#new-channel' }],
            },
          },
          isValid: true,
        });
      });
    });
  });
});
