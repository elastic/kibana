/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AuthConfig } from './auth_config';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthType, SSLCertType } from '../../../common/auth/constants';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';
import { MockedCodeEditor } from '@kbn/code-editor-mock';

describe('AuthConfig renders', () => {
  const onSubmit = jest.fn();

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

  describe('Validation', () => {
    const defaultTestFormData = {
      config: {
        headers: [{ key: 'content-type', value: 'text' }],
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
          headers: [{ key: 'content-type', value: 'text' }],
          hasAuth: true,
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

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              headers: [{ key: 'content-type', value: 'text' }],
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
              headers: [{ key: 'content-type', value: 'text' }],
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
              headers: [{ key: 'content-type', value: 'text' }],
            },
            secrets: {
              user: 'user',
              password: 'pass',
            },
            __internal__: {
              hasHeaders: true,
              hasCA: true,
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
              headers: [{ key: 'content-type', value: 'text' }],
            },
            secrets: {
              crt: Buffer.from('some binary string').toString('base64'),
              key: Buffer.from('some binary string').toString('base64'),
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
              headers: [{ key: 'content-type', value: 'text' }],
            },
            secrets: {
              pfx: Buffer.from('some binary string').toString('base64'),
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
  });

  describe('AuthConfig with showOAuth2Option', () => {
    it('does not render OAuth2 option by default (showOAuth2Option=false)', async () => {
      const testFormData = {
        config: {
          hasAuth: false,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} />
        </AuthFormTestProvider>
      );

      // OAuth2 option should not be rendered
      expect(screen.queryByTestId('authOAuth2')).not.toBeInTheDocument();
    });

    it('renders OAuth2 option when showOAuth2Option is explicitly set to true', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: 'oauth2',
          accessTokenUrl: 'https://api.example.com/oauth/token',
          clientId: 'client_id_123',
        },
        secret: {
          clientSecret: 'read write', // This would overwrite the actual client secret!
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      // OAuth2 option should be rendered
      expect(await screen.findByTestId('authOAuth2')).toBeInTheDocument();
      expect(await screen.findByText('OAuth 2.0')).toBeInTheDocument();
    });

    it('renders OAuth2 fields when authType is OAuth2 and showOAuth2Option=true', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      // OAuth2 fields should be rendered
      expect(await screen.findByTestId('authOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('clientIdOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('clientSecretOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('ScopeOAuth2')).toBeInTheDocument();
      expect(await screen.findByTestId('additionalFields')).toBeInTheDocument();
    });

    it('submits additionalFields value when authType is OAuth2', async () => {
      const validJson = JSON.stringify({ custom: 'data', number: 123 });
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
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
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('additionalFields')).toBeInTheDocument();

      await act(async () => {
        await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      });

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              hasAuth: true,
              authType: AuthType.OAuth2,
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
    });

    it('fails validation when required OAuth2 fields are missing', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
          // Missing accessTokenUrl, clientId
        },
        secrets: {
          // Missing clientSecret
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('authOAuth2')).toBeInTheDocument();

      await act(async () => {
        await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
      });

      expect(await screen.findByText('Access token URL is required.')).toBeInTheDocument();
      expect(await screen.findByText('Client ID is required.')).toBeInTheDocument();
      expect(await screen.findByText('Client secret is required.')).toBeInTheDocument();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {}, // Data is empty because form is invalid
          isValid: false,
        });
      });
    });

    it('validates additionalFields input for valid/invalid JSON', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
          accessTokenUrl: 'https://test.url',
          clientId: 'testClient',
        },
        secrets: {
          clientSecret: 'testSecret',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      let additionalFieldsInput: HTMLTextAreaElement | null = null;
      await waitFor(() => {
        additionalFieldsInput = document.querySelector('textarea');
        expect(additionalFieldsInput).toBeInTheDocument();
      });
      expect(additionalFieldsInput).not.toBeNull();

      await act(async () => {
        await userEvent.clear(additionalFieldsInput!);
        await userEvent.type(additionalFieldsInput!, '{{key": "value');
      });

      expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();

      await act(async () => {
        await userEvent.clear(additionalFieldsInput!);
        await userEvent.type(additionalFieldsInput!, '{{"sdf": "value"}');
      });
      screen.debug(undefined, 30000);
      await waitFor(() => {
        expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
      });
    });

    it('does not render OAuth2 fields when authType is OAuth2 but showOAuth2Option=false', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={false} />
        </AuthFormTestProvider>
      );

      // OAuth2 radio itself should not be present
      expect(screen.queryByTestId('authOAuth2')).not.toBeInTheDocument();
      // Consequently, none of the OAuth2 specific fields should be present
      expect(screen.queryByTestId('accessTokenUrlAOuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clientIdOAuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clientSecretOAuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ScopeOAuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('additionalFields')).not.toBeInTheDocument();
    });

    it('renders OAuth2 fields as readOnly when readOnly prop is true', async () => {
      jest.mock('@kbn/code-editor', () => {
        const original = jest.requireActual('@kbn/code-editor');
        return {
          ...original,
          CodeEditor: (props: any) => {
            return <MockedCodeEditor {...props} />;
          },
        };
      });
      const initialJson = JSON.stringify({ initial: 'value' });
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
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
          <AuthConfig readOnly={true} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      // Check a few fields for the readOnly attribute or disabled state
      const accessTokenInput = await screen.findByTestId('accessTokenUrlAOuth2');
      expect(accessTokenInput).toHaveAttribute('readonly');

      const clientIdInput = await screen.findByTestId('clientIdOAuth2');
      expect(clientIdInput).toHaveAttribute('readonly');

      const clientSecretContainer = await screen.findByTestId('clientSecretOAuth2');
      const actualInput = clientSecretContainer.querySelector('input');

      if (actualInput) {
        expect(actualInput).toBeDisabled();
      } else {
        expect(clientSecretContainer).toBeInTheDocument();
      }

      const scopeInput = await screen.findByTestId('ScopeOAuth2');
      expect(scopeInput).toHaveAttribute('readonly');

      // Check the mocked textarea for readonly
      const additionalFieldsContainer = await screen.findByTestId('additionalFields');
      const textarea = additionalFieldsContainer.querySelector('textarea');
      expect(textarea).not.toBeNull();
      expect(textarea).toHaveAttribute('readonly');

      // Ensure radio buttons are disabled
      const authNoneRadio = await screen.findByTestId('authNone');
      expect(authNoneRadio.querySelector('input')).toBeDisabled();

      const authBasicRadio = await screen.findByTestId('authBasic');
      expect(authBasicRadio.querySelector('input')).toBeDisabled();

      const authSSLRadio = await screen.findByTestId('authSSL');
      expect(authSSLRadio.querySelector('input')).toBeDisabled();

      const authOAuth2Radio = await screen.findByTestId('authOAuth2');
      expect(authOAuth2Radio.querySelector('input')).toBeDisabled();

      // Ensure toggles are disabled
      expect(await screen.findByTestId('webhookViewHeadersSwitch')).toBeDisabled();
      expect(await screen.findByTestId('webhookViewCASwitch')).toBeDisabled();
    });

    it('switches from OAuth2 to Basic Auth correctly', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
          accessTokenUrl: 'https://initial.url',
          clientId: 'initialClient',
        },
        secrets: {
          clientSecret: 'initialSecret',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();

      // Switch to Basic Auth
      const basicAuthRadio = await screen.findByTestId('authBasic');
      const basicAuthRadioInput = basicAuthRadio.querySelector('input');
      expect(basicAuthRadioInput).not.toBeNull();
      await act(async () => {
        await userEvent.click(basicAuthRadioInput!);
      });

      const basicAuthContainer = await screen.findByTestId('basicAuthFields');
      expect(basicAuthContainer).toBeInTheDocument();

      const usernameInput = await within(basicAuthContainer).findByLabelText('Username');
      const passwordInput = await within(basicAuthContainer).findByLabelText('Password');

      expect(usernameInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();

      // Check that OAuth2 fields are now hidden
      expect(screen.queryByTestId('accessTokenUrlAOuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clientIdOAuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clientSecretOAuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ScopeOAuth2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('additionalFields')).not.toBeInTheDocument();
    });

    it('allows toggling headers when OAuth2 is selected', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
          accessTokenUrl: 'https://initial.url',
          clientId: 'initialClient',
        },
        secrets: {
          clientSecret: 'initialSecret',
        },
        __internal__: {
          hasHeaders: false,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      // Ensure OAuth2 fields are visible
      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();

      // Headers should initially be hidden
      expect(screen.queryByTestId('webhookHeaderText')).not.toBeInTheDocument();

      // Toggle headers on
      const headersToggle = await screen.findByTestId('webhookViewHeadersSwitch');
      await act(async () => {
        await userEvent.click(headersToggle);
      });

      // Headers should now be visible
      expect(await screen.findByTestId('webhookHeaderText')).toBeInTheDocument();
      expect(await screen.findByTestId('webhookHeadersKeyInput')).toBeInTheDocument();
      expect(await screen.findByTestId('webhookHeadersValueInput')).toBeInTheDocument();

      // Ensure OAuth2 fields are still visible
      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();
    });

    it('allows toggling CA when OAuth2 is selected', async () => {
      const testFormData = {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2,
          accessTokenUrl: 'https://initial.url',
          clientId: 'initialClient',
        },
        secrets: {
          clientSecret: 'initialSecret',
        },
        __internal__: {
          hasCA: false,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
          <AuthConfig readOnly={false} showOAuth2Option={true} />
        </AuthFormTestProvider>
      );

      // Ensure OAuth2 fields are visible
      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();

      // CA fields should initially be hidden
      expect(screen.queryByTestId('webhookCAInput')).not.toBeInTheDocument();

      // Toggle CA on
      const caToggle = await screen.findByTestId('webhookViewCASwitch');
      await act(async () => {
        await userEvent.click(caToggle);
      });

      // CA fields should now be visible
      expect(await screen.findByTestId('webhookCAInput')).toBeInTheDocument();
      expect(await screen.findByTestId('webhookVerificationModeSelect')).toBeInTheDocument();

      // Ensure OAuth2 fields are still visible
      expect(await screen.findByTestId('accessTokenUrlAOuth2')).toBeInTheDocument();
    });
  });
});
