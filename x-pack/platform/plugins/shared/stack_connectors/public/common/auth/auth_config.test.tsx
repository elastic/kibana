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
import { AuthType, SSLCertType } from '../../../common/auth/constants';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';

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
});
