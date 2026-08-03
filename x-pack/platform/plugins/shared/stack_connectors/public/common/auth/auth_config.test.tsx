/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AuthConfig } from './auth_config';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthType, SSLCertType } from '@kbn/connector-schemas/common/auth/constants';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';
import { useSecretHeaders } from './use_secret_headers';

jest.mock('./use_secret_headers');

const useSecretHeadersMock = useSecretHeaders as jest.Mock;

describe('AuthConfig renders', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    useSecretHeadersMock.mockReturnValue({ isLoading: false, isFetching: false, data: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all fields for authType=None', async () => {
    const testFormData = {
      config: {
        hasAuth: false,
      },
      __internal__: {
        hasCA: true,
        hasHeaders: true,
      },
    };
    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('webhookViewHeadersSwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookHeaderText')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookHeadersKeyInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookHeadersValueInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookAddHeaderButton')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookViewCASwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookCAInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookVerificationModeSelect')).toBeInTheDocument();
    expect(await screen.findByTestId('authNone')).toBeInTheDocument();
    expect(await screen.findByTestId('authBasic')).toBeInTheDocument();
    expect(screen.queryByTestId('basicAuthFields')).not.toBeInTheDocument();
    expect(await screen.findByTestId('authSSL')).toBeInTheDocument();
    expect(screen.queryByTestId('sslCertFields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('authOAuth2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('OAuth 2.0')).not.toBeInTheDocument();
  });

  it('toggles headers as expected', async () => {
    const testFormData = {
      config: {
        hasAuth: false,
      },
      __internal__: {
        hasCA: false,
        hasHeaders: false,
      },
    };
    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    const headersToggle = await screen.findByTestId('webhookViewHeadersSwitch');

    expect(headersToggle).toBeInTheDocument();

    await userEvent.click(headersToggle);

    expect(await screen.findByTestId('webhookHeaderText')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookHeadersKeyInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookHeadersValueInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookAddHeaderButton')).toBeInTheDocument();
  });

  it('toggles CA as expected', async () => {
    const testFormData = {
      config: {
        hasAuth: false,
      },
      __internal__: {
        hasCA: false,
        hasHeaders: false,
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    const caToggle = await screen.findByTestId('webhookViewCASwitch');

    expect(caToggle).toBeInTheDocument();

    await userEvent.click(caToggle);

    expect(await screen.findByTestId('webhookViewCASwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookCAInput')).toBeInTheDocument();

    const verificationModeSelect = await screen.findByTestId('webhookVerificationModeSelect');

    expect(verificationModeSelect).toBeInTheDocument();

    ['None', 'Certificate', 'Full'].forEach((optionName) => {
      const select = within(verificationModeSelect);

      expect(select.getByRole('option', { name: optionName }));
    });
  });

  it('renders all fields for authType=Basic', async () => {
    const testFormData = {
      config: {
        hasAuth: true,
        authType: AuthType.Basic,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('webhookViewHeadersSwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookViewCASwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('authNone')).toBeInTheDocument();
    expect(await screen.findByTestId('authBasic')).toBeInTheDocument();
    expect(await screen.findByTestId('basicAuthFields')).toBeInTheDocument();
    expect(await screen.findByTestId('authSSL')).toBeInTheDocument();
    expect(screen.queryByTestId('sslCertFields')).not.toBeInTheDocument();
  });

  it('renders all fields for authType=SSL', async () => {
    const testFormData = {
      config: {
        hasAuth: true,
        authType: AuthType.SSL,
        certType: SSLCertType.CRT,
      },
      secrets: {
        crt: Buffer.from('some binary string').toString('base64'),
        key: Buffer.from('some binary string').toString('base64'),
      },
    };
    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('webhookViewHeadersSwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookViewCASwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('authNone')).toBeInTheDocument();
    expect(await screen.findByTestId('authBasic')).toBeInTheDocument();
    expect(screen.queryByTestId('basicAuthFields')).not.toBeInTheDocument();
    expect(await screen.findByTestId('authSSL')).toBeInTheDocument();
    expect(await screen.findByTestId('sslCertFields')).toBeInTheDocument();
  });

  it('renders all fields for authType=SSL and certType=PFX', async () => {
    const testFormData = {
      config: {
        hasAuth: true,
        authType: AuthType.SSL,
        certType: SSLCertType.PFX,
      },
      secrets: {
        crt: Buffer.from('some binary string').toString('base64'),
        key: Buffer.from('some binary string').toString('base64'),
      },
    };
    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('webhookViewHeadersSwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookViewCASwitch')).toBeInTheDocument();
    expect(await screen.findByTestId('authNone')).toBeInTheDocument();
    expect(await screen.findByTestId('authBasic')).toBeInTheDocument();
    expect(screen.queryByTestId('basicAuthFields')).not.toBeInTheDocument();
    expect(await screen.findByTestId('authSSL')).toBeInTheDocument();
    expect(await screen.findByTestId('sslCertFields')).toBeInTheDocument();
  });

  describe('secret headers', () => {
    const defaultTestFormData = {
      config: {
        hasAuth: false,
      },
      __internal__: {
        hasHeaders: true,
        hasCA: false,
        headers: [{ key: 'config-key', value: 'text', type: 'config' }],
      },
    };

    beforeEach(() =>
      useSecretHeadersMock
        .mockReturnValueOnce({
          isLoading: true,
          isFetching: true,
          data: [],
        })
        .mockReturnValue({
          isLoading: false,
          isFetching: false,
          data: ['secret-key'],
        })
    );

    it('submits secret headers merged with config headers', async () => {
      render(
        <AuthFormTestProvider defaultValue={defaultTestFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('webhookHeadersSecretValueInput'));
      await userEvent.paste('foobar');

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: false,
              authType: null,
            },
            __internal__: {
              hasHeaders: true,
              hasCA: false,
              headers: [
                { key: 'config-key', value: 'text', type: 'config' },
                { key: 'secret-key', value: 'foobar', type: 'secret' },
              ],
            },
          },
          isValid: true,
        });
      });
    });

    it('deleting the headers and submitting works as expected', async () => {
      render(
        <AuthFormTestProvider defaultValue={defaultTestFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('webhookHeadersSecretValueInput'));
      await userEvent.paste('foobar');

      const deleteButtons = await screen.findAllByTestId('webhookRemoveHeaderButton');
      expect(deleteButtons).toHaveLength(2);

      await userEvent.click(deleteButtons[0]);
      await userEvent.click(deleteButtons[1]);

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: false,
              authType: null,
            },
            __internal__: {
              hasHeaders: true,
              hasCA: false,
            },
          },
          isValid: true,
        });
      });
    });

    it('toggling off the headers switch and submitting works as expected', async () => {
      render(
        <AuthFormTestProvider defaultValue={defaultTestFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('webhookViewHeadersSwitch'));
      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: false,
              authType: null,
            },
            __internal__: {
              hasHeaders: false,
              hasCA: false,
            },
          },
          isValid: true,
        });
      });
    });

    it('submits properly when there are only secret headers', async () => {
      const testFormData = {
        ...defaultTestFormData,
        __internal__: {
          hasHeaders: true,
          hasCA: false,
          headers: [],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('webhookHeadersSecretValueInput'));
      await userEvent.paste('foobar');

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: false,
              authType: null,
            },
            __internal__: {
              hasHeaders: true,
              hasCA: false,
              headers: [{ key: 'secret-key', value: 'foobar', type: 'secret' }],
            },
          },
          isValid: true,
        });
      });
    });

    it('validation fails if the secret header value is empty', async () => {
      render(
        <AuthFormTestProvider defaultValue={defaultTestFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      // We submit without populating the secret header value field
      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    it('keeps the header when changing its type from config to secret', async () => {
      useSecretHeadersMock.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: [],
      });

      render(
        <AuthFormTestProvider defaultValue={defaultTestFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      const typeSelector = await screen.findByTestId('webhookHeaderTypeSelect');

      await userEvent.click(typeSelector);
      await userEvent.click(await screen.findByTestId('option-secret'), { pointerEventsCheck: 0 });

      expect(await screen.findByTestId('webhookHeadersKeyInput')).toHaveValue('config-key');
      expect(await screen.findByTestId('webhookHeadersSecretValueInput')).toBeInTheDocument();
      expect(await screen.findByTestId('webhookHeadersSecretValueInput')).toHaveValue('text');
      expect(typeSelector).toHaveTextContent('Secret');
      expect(await screen.findByTestId('form-test-provide-submit')).not.toBeDisabled();
    });

    it('submits properly when changing the header type from config to secret', async () => {
      const testFormData = {
        config: {
          hasAuth: false,
        },
        __internal__: {
          hasHeaders: true,
          hasCA: false,
          headers: [
            { key: 'key-1', value: 'text-1', type: 'config' },
            { key: 'key-2', value: 'text-2', type: 'config' },
          ],
        },
      };
      useSecretHeadersMock.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: [],
      });

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      const typeSelectors = await screen.findAllByTestId('webhookHeaderTypeSelect');
      await userEvent.click(typeSelectors[0]);
      await userEvent.click(await screen.findByTestId('option-secret'), { pointerEventsCheck: 0 });

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: false,
              authType: null,
            },
            __internal__: {
              hasHeaders: true,
              hasCA: false,
              headers: [
                { key: 'key-1', value: 'text-1', type: 'secret' },
                { key: 'key-2', value: 'text-2', type: 'config' },
              ],
            },
          },
          isValid: true,
        });
      });
    });
  });

  describe('Validation', () => {
    const defaultTestFormData = {
      config: {
        headers: [{ key: 'content-type', value: 'text', type: 'config' }],
        hasAuth: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('succeeds with hasAuth=True', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
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
      };
      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
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
          },
          isValid: true,
        });
      });
    });

    it('succeeds with hasAuth=false', async () => {
      const testFormData = {
        config: {
          ...defaultTestFormData.config,
          hasAuth: false,
        },
        __internal__: {
          hasHeaders: true,
          hasCA: false,
          headers: [{ key: 'content-type', value: 'text', type: 'config' }],
        },
      };
      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: false,
              authType: null,
            },
            __internal__: {
              hasHeaders: true,
              hasCA: false,
              headers: [{ key: 'content-type', value: 'text', type: 'config' }],
            },
          },
          isValid: true,
        });
      });
    });

    it('succeeds without headers', async () => {
      const testConfig = {
        config: {
          hasAuth: true,
          authType: AuthType.Basic,
        },
        secrets: {
          user: 'user',
          password: 'pass',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
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
          },
          isValid: true,
        });
      });
    });

    it('succeeds with CA and verificationMode', async () => {
      const testConfig = {
        ...defaultTestFormData,
        config: {
          ...defaultTestFormData.config,
          ca: Buffer.from('some binary string').toString('base64'),
          verificationMode: 'full',
        },
        __internal__: {
          hasHeaders: true,
          hasCA: true,
          headers: [{ key: 'content-type', value: 'text', type: 'config' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: true,
              authType: AuthType.Basic,
              ca: Buffer.from('some binary string').toString('base64'),
              verificationMode: 'full',
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
          },
          isValid: true,
        });
      });
    });

    it('fails with hasCa=true and a missing CA', async () => {
      const testConfig = {
        ...defaultTestFormData,
        config: {
          ...defaultTestFormData.config,
          verificationMode: 'full',
        },
        __internal__: {
          hasHeaders: true,
          hasCA: true,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    it('succeeds with authType=SSL and a CRT and KEY', async () => {
      const testConfig = {
        config: {
          ...defaultTestFormData.config,
          authType: AuthType.SSL,
          certType: SSLCertType.CRT,
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
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: true,
              authType: AuthType.SSL,
              certType: SSLCertType.CRT,
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
          },
          isValid: true,
        });
      });
    });

    it('succeeds with authType=SSL and a PFX', async () => {
      const testConfig = {
        config: {
          ...defaultTestFormData.config,
          authType: AuthType.SSL,
          certType: SSLCertType.PFX,
        },
        secrets: {
          pfx: Buffer.from('some binary string').toString('base64'),
        },
        __internal__: {
          hasHeaders: true,
          hasCA: false,
          headers: [{ key: 'content-type', value: 'text', type: 'config' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: true,
              authType: AuthType.SSL,
              certType: SSLCertType.PFX,
            },
            secrets: {
              pfx: Buffer.from('some binary string').toString('base64'),
            },
            __internal__: {
              hasHeaders: true,
              hasCA: false,
              headers: [{ key: 'content-type', value: 'text', type: 'config' }],
            },
          },
          isValid: true,
        });
      });
    });

    it('validation fails if there are 2 headers with the same key', async () => {
      const testFormData = {
        ...defaultTestFormData,
        __internal__: {
          hasHeaders: true,
          hasCA: false,
          headers: [
            { key: 'same-key', value: 'text 1', type: 'config' },
            { key: 'same-key', value: 'text 2', type: 'config' },
          ],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    it('validation fails if header key is empty', async () => {
      const testFormData = {
        ...defaultTestFormData,
        __internal__: {
          hasHeaders: true,
          hasCA: false,
          headers: [{ key: '', value: 'text', type: 'config' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {},
          isValid: false,
        });
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/249443
  describe.skip('AuthConfig with showOAuth2Option on', () => {
    it('renders OAuth2 option when showOAuth2Option is explicitly set to true', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://api.example.com/oauth/token',
          clientId: 'client_id_123',
        },
        secret: {
          clientSecret: 'secret_123',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} isOAuth2Enabled={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('authOAuth2')).toBeInTheDocument();
      expect(await screen.findByText('OAuth 2.0 Client Credentials')).toBeInTheDocument();
    });

    it('renders OAuth2 fields when authType is OAuth2', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} isOAuth2Enabled={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('authOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('clientIdOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('clientSecretOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('ScopeOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('additionalFields')).toBeInTheDocument();
      expect(await screen.findByTestId('additional_fieldsJsonEditor')).toBeInTheDocument();
    });

    it('submits additionalFields value when authType is OAuth2', async () => {
      const validJson = JSON.stringify({ custom: 'data', number: 123 });
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client1',
          scope: 'scope1',
          additionalFields: validJson,
        },
        secrets: {
          clientSecret: 'secret1',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} isOAuth2Enabled={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('additionalFields')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());

      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          config: {
            hasAuth: true,
            authType: AuthType.OAuth2ClientCredentials,
            accessTokenUrl: 'https://token.url',
            clientId: 'client1',
            scope: 'scope1',
            additionalFields: validJson,
          },
          secrets: {
            clientSecret: 'secret1',
          },
          __internal__: {
            hasHeaders: false,
            hasCA: false,
          },
        },
        isValid: true,
      });
    });

    it('fails validation when required OAuth2 fields are missing', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          // Missing accessTokenUrl, clientId
        },
        secrets: {
          // Missing clientSecret
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} isOAuth2Enabled={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('authOAuth2')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      expect(await screen.findByText('Access token URL is required.')).toBeInTheDocument();
      expect(await screen.findByText('Client ID is required.')).toBeInTheDocument();
      expect(await screen.findByText('Client secret is required.')).toBeInTheDocument();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        data: {}, // Data is empty because form is invalid
        isValid: false,
      });
    });

    it('validates additionalFields input for invalid JSON', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://test.url',
          clientId: 'testClient',
        },
        secrets: {
          clientSecret: 'testSecret',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} isOAuth2Enabled={true} />
        </AuthFormTestProvider>
      );

      let additionalFieldsInput: HTMLTextAreaElement | null = null;
      await waitFor(() => {
        additionalFieldsInput = document.querySelector('textarea');
        expect(additionalFieldsInput).toBeInTheDocument();
      });

      expect(additionalFieldsInput).not.toBeNull();

      await userEvent.clear(additionalFieldsInput!);
      await userEvent.type(additionalFieldsInput!, '{{key": "value');

      expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();
    });

    it('renders OAuth2 fields as readOnly when readOnly prop is true', async () => {
      const initialJson = JSON.stringify({ initial: 'value' });
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://initial.url',
          clientId: 'initialClient',
          scope: 'readScope',
          additionalFields: initialJson,
        },
        secrets: {
          clientSecret: 'initialSecret',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={true} isOAuth2Enabled={true} />
        </AuthFormTestProvider>
      );

      const accessTokenInput = await screen.findByTestId('accessTokenUrlAOuth2');
      expect(accessTokenInput).toHaveAttribute('readonly');

      const clientIdInput = await screen.findByTestId('clientIdOAuth2');
      expect(clientIdInput).toHaveAttribute('readonly');

      const clientSecretContainer = await screen.findByTestId('clientSecretOAuth2');
      expect(clientSecretContainer).toHaveAttribute('readonly');

      const scopeInput = await screen.findByTestId('ScopeOAuth2');
      expect(scopeInput).toHaveAttribute('readonly');

      const additionalFieldsContainer = await screen.findByTestId(
        'additional_fieldsJsonEditorReadOnly'
      );
      expect(additionalFieldsContainer).toBeInTheDocument();
    });
  });
});
