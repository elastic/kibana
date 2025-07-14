/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SSLCertFields } from './ssl_cert_fields';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SSLCertType } from '../../../common/auth/constants';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';
import { useConnectorContext } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

const certTypeDefaultValue: SSLCertType = SSLCertType.CRT;

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useConnectorContext: jest.fn(),
}));

describe('SSLCertFields', () => {
  beforeEach(() => {
    (useConnectorContext as jest.Mock).mockReturnValue({
      services: { isWebhookSslWithPfxEnabled: true },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const onSubmit = jest.fn();

  it('renders all fields for certType=CRT', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <SSLCertFields
          readOnly={false}
          certTypeDefaultValue={certTypeDefaultValue}
          certType={SSLCertType.CRT}
        />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('sslCertFields')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookSSLPassphraseInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookCertTypeTabs')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookSSLCRTInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookSSLKEYInput')).toBeInTheDocument();
  });

  it('renders all fields for certType=PFX', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <SSLCertFields
          readOnly={false}
          certTypeDefaultValue={certTypeDefaultValue}
          certType={SSLCertType.PFX}
        />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('sslCertFields')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookSSLPassphraseInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookCertTypeTabs')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookSSLPFXInput')).toBeInTheDocument();
  });

  describe('Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('validates correctly with a PFX', async () => {
      const testConfig = {
        config: {
          certType: SSLCertType.PFX,
        },
        secrets: {
          pfx: Buffer.from('some binary string').toString('base64'),
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <SSLCertFields
            readOnly={false}
            certTypeDefaultValue={SSLCertType.PFX}
            certType={SSLCertType.PFX}
          />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              certType: SSLCertType.PFX,
            },
            secrets: {
              pfx: Buffer.from('some binary string').toString('base64'),
            },
          },
          isValid: true,
        });
      });
    });

    it('validates correctly a missing PFX', async () => {
      const testConfig = {
        config: {
          certType: SSLCertType.PFX,
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <SSLCertFields
            readOnly={false}
            certTypeDefaultValue={SSLCertType.PFX}
            certType={SSLCertType.PFX}
          />
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

    it('validates correctly with a CRT and KEY', async () => {
      const testConfig = {
        config: {
          certType: SSLCertType.CRT,
        },
        secrets: {
          crt: Buffer.from('some binary string').toString('base64'),
          key: Buffer.from('some binary string').toString('base64'),
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <SSLCertFields
            readOnly={false}
            certTypeDefaultValue={SSLCertType.CRT}
            certType={SSLCertType.CRT}
          />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            config: {
              certType: SSLCertType.CRT,
            },
            secrets: {
              crt: Buffer.from('some binary string').toString('base64'),
              key: Buffer.from('some binary string').toString('base64'),
            },
          },
          isValid: true,
        });
      });
    });

    it('validates correctly with a CRT but a missing KEY', async () => {
      const testConfig = {
        config: {
          certType: SSLCertType.CRT,
        },
        secrets: {
          crt: Buffer.from('some binary string').toString('base64'),
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <SSLCertFields
            readOnly={false}
            certTypeDefaultValue={SSLCertType.CRT}
            certType={SSLCertType.CRT}
          />
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

    it('validates correctly with a KEY but a missing CRT', async () => {
      const testConfig = {
        config: {
          certType: SSLCertType.CRT,
        },
        secrets: {
          key: Buffer.from('some binary string').toString('base64'),
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <SSLCertFields
            readOnly={false}
            certTypeDefaultValue={SSLCertType.CRT}
            certType={SSLCertType.CRT}
          />
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
});

describe('validation with PFX disabled', () => {
  beforeEach(() => {
    (useConnectorContext as jest.Mock).mockReturnValue({
      services: { isWebhookSslWithPfxEnabled: false },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not render PFX tab when PFX is disabled', async () => {
    render(
      <AuthFormTestProvider onSubmit={jest.fn()}>
        <SSLCertFields
          readOnly={false}
          certTypeDefaultValue={certTypeDefaultValue}
          certType={SSLCertType.CRT}
          isPfxEnabled={false}
        />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('sslCertFields')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookSSLPassphraseInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookCertTypeTabs')).toBeInTheDocument();
    expect(screen.queryByText(i18n.CERT_TYPE_PFX)).not.toBeInTheDocument();
  });
});
