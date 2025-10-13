/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import WebhookActionConnectorFields from './webhook_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthType, SSLCertType } from '../../../common/auth/constants';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useConnectorContext } from '@kbn/triggers-actions-ui-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  formSerializer,
  formDeserializer,
} from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/connector_form';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const original = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    ...original,
    useKibana: jest.fn(),
    useConnectorContext: jest.fn(),
  };
});

const customQueryProviderWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('WebhookActionConnectorFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          get: jest.fn(),
          post: jest.fn(),
        },
        notifications: {
          toasts: {
            addError: jest.fn(),
          },
        },
      },
    });
    (useConnectorContext as jest.Mock).mockReturnValue({
      services: {
        isWebhookSslWithPfxEnabled: true,
      },
    });
  });

  it('renders all connector fields', async () => {
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'https://test.com',
        headers: [{ key: 'content-type', value: 'text', type: 'config' }],
        hasAuth: true,
        authType: AuthType.Basic,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <WebhookActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>,
      { wrapper: customQueryProviderWrapper }
    );

    await screen.findByTestId('webhookViewHeadersSwitch');
    userEvent.click(screen.getByTestId('webhookViewHeadersSwitch'));
    expect(screen.getByTestId('webhookMethodSelect')).toBeInTheDocument();
    expect(screen.getByTestId('webhookUrlText')).toBeInTheDocument();
    expect(screen.getByTestId('webhookUserInput')).toBeInTheDocument();
    expect(screen.getByTestId('webhookPasswordInput')).toBeInTheDocument();
  });

  it('renders OAuth2 option and fields', async () => {
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'https://test.com',
        headers: { 'content-type': 'text' },
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
      },
      secrets: {},
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider
        connector={actionConnector}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <WebhookActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>,
      { wrapper: customQueryProviderWrapper }
    );

    await screen.findByTestId('authOAuth2');
    expect(screen.getByTestId('authOAuth2')).toBeInTheDocument();
    expect(screen.getByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();
    expect(screen.getByTestId('clientIdOAuth2')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const onSubmit = jest.fn();
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'https://test.com',
        headers: { 'content-type': 'text' },
        hasAuth: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const tests: Array<[string, string]> = [
      ['webhookUrlText', 'not-valid'],
      ['webhookUserInput', ''],
      ['webhookPasswordInput', ''],
    ];

    it('connector validation succeeds when connector config is valid', async () => {
      const { getByTestId } = render(
        <ConnectorFormTestProvider
          connector={actionConnector}
          onSubmit={onSubmit}
          serializer={formSerializer}
          deserializer={formDeserializer}
        >
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await screen.findByTestId('webhookHeaderPanel');

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            headers: { 'content-type': 'text' },
            hasAuth: true,
            authType: AuthType.Basic,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: true,
            hasCA: false,
            headers: [{ key: 'content-type', value: 'text', type: 'config' }],
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('connector validation succeeds when auth=false', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          hasAuth: false,
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider
          connector={connector}
          onSubmit={onSubmit}
          serializer={formSerializer}
          deserializer={formDeserializer}
        >
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await screen.findByTestId('webhookHeaderPanel');

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            headers: { 'content-type': 'text' },
            hasAuth: false,
            authType: null,
          },
          secrets: {},
          __internal__: {
            hasHeaders: true,
            hasCA: false,
            headers: [{ key: 'content-type', value: 'text', type: 'config' }],
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('connector validation succeeds without headers', async () => {
      const connector = {
        ...actionConnector,
        config: {
          method: 'PUT',
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.Basic,
        },
      };

      const { getByTestId } = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await act(async () => {
        await userEvent.click(getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.Basic,
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: false,
            hasCA: false,
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly if the method is empty', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          method: '',
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    it.each(tests)('validates correctly %p', async (field, value) => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          headers: [],
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await userEvent.clear(res.getByTestId(field));
      if (value !== '') {
        await userEvent.type(res.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(res.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });

    it('validates correctly with a CA and verificationMode', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          ca: Buffer.from('some binary string').toString('base64'),
          verificationMode: 'full',
        },
      };

      const res = render(
        <ConnectorFormTestProvider
          connector={connector}
          onSubmit={onSubmit}
          serializer={formSerializer}
          deserializer={formDeserializer}
        >
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await screen.findByTestId('webhookHeaderPanel');

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.Basic,
            ca: Buffer.from('some binary string').toString('base64'),
            verificationMode: 'full',
            headers: { 'content-type': 'text' },
          },
          secrets: {
            user: 'user',
            password: 'pass',
          },
          __internal__: {
            hasHeaders: true,
            hasCA: true,
            headers: [{ key: 'content-type', value: 'text', type: 'config' }],
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly with a CRT and KEY', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          authType: AuthType.SSL,
          certType: SSLCertType.CRT,
        },
        secrets: {
          crt: Buffer.from('some binary string').toString('base64'),
          key: Buffer.from('some binary string').toString('base64'),
        },
      };

      const res = render(
        <ConnectorFormTestProvider
          connector={connector}
          onSubmit={onSubmit}
          serializer={formSerializer}
          deserializer={formDeserializer}
        >
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await screen.findByTestId('webhookHeaderPanel');

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.SSL,
            certType: SSLCertType.CRT,
            headers: { 'content-type': 'text' },
          },
          secrets: {
            crt: Buffer.from('some binary string').toString('base64'),
            key: Buffer.from('some binary string').toString('base64'),
          },
          __internal__: {
            hasHeaders: true,
            hasCA: false,
            headers: [{ key: 'content-type', value: 'text', type: 'config' }],
          },
          isDeprecated: false,
        },
        isValid: true,
      });
    });

    it('validates correctly with a PFX', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          authType: AuthType.SSL,
          certType: SSLCertType.PFX,
        },
        secrets: {
          pfx: Buffer.from('some binary string').toString('base64'),
        },
      };

      const res = render(
        <ConnectorFormTestProvider
          connector={connector}
          onSubmit={onSubmit}
          serializer={formSerializer}
          deserializer={formDeserializer}
        >
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await screen.findByTestId('webhookHeaderPanel');

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.webhook',
          name: 'webhook',
          config: {
            method: 'PUT',
            url: 'https://test.com',
            hasAuth: true,
            authType: AuthType.SSL,
            certType: SSLCertType.PFX,
            headers: { 'content-type': 'text' },
          },
          secrets: {
            pfx: Buffer.from('some binary string').toString('base64'),
          },
          isDeprecated: false,
          __internal__: {
            hasHeaders: true,
            headers: [{ key: 'content-type', value: 'text', type: 'config' }],
            hasCA: false,
          },
        },
        isValid: true,
      });
    });

    it('fails to validate with a CRT but no KEY', async () => {
      const connector = {
        ...actionConnector,
        config: {
          ...actionConnector.config,
          authType: AuthType.SSL,
          certType: SSLCertType.CRT,
        },
        secrets: {
          crt: Buffer.from('some binary string').toString('base64'),
        },
      };

      const res = render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <WebhookActionConnectorFields
            readOnly={false}
            isEdit={false}
            registerPreSubmitValidator={() => {}}
          />
        </ConnectorFormTestProvider>,
        { wrapper: customQueryProviderWrapper }
      );

      await act(async () => {
        await userEvent.click(res.getByTestId('form-test-provide-submit'));
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {},
        isValid: false,
      });
    });
  });
});
