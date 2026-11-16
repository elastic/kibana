/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { outputType } from '../../../common/constants';
import { withSavedSecrets } from '../secrets/preserve';

import { getOutputSecretFields } from './secret_fields';

describe('getOutputSecretFields', () => {
  describe('OTLP TLS credentials', () => {
    const original = {
      otlp_exporter: { endpoint: 'https://otel.example.com:4317', protocol: 'grpc' },
      secrets: {
        otlp_exporter: {
          tls: {
            key_pem: { id: 'key-pem-id' },
            tpm: { owner_auth: { id: 'owner-auth-id' }, auth: { id: 'auth-id' } },
          },
        },
      },
    };
    const fields = getOutputSecretFields(outputType.Otlp);

    it('keeps every saved credential when the update does not touch them', () => {
      const update = { name: 'renamed' };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        name: 'renamed',
        secrets: original.secrets,
      });
    });

    it('keeps every saved credential when the update only changes other TLS settings', () => {
      const update = { otlp_exporter: { tls: { insecure: true } } };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        ...update,
        secrets: original.secrets,
      });
    });

    it('removes every credential when the TLS settings are cleared', () => {
      const update = { otlp_exporter: { tls: null } };

      expect(withSavedSecrets({ fields, original, update })).toEqual(update);
    });

    it('removes the TLS key, and only it, when it is cleared with an explicit null', () => {
      const update = { secrets: { otlp_exporter: { tls: { key_pem: null } } } };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        secrets: {
          otlp_exporter: {
            tls: {
              key_pem: null,
              tpm: { owner_auth: { id: 'owner-auth-id' }, auth: { id: 'auth-id' } },
            },
          },
        },
      });
    });

    it('removes the TPM credentials, and only those, when the TPM settings are cleared', () => {
      const update = { otlp_exporter: { tls: { tpm: null } } };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        ...update,
        secrets: { otlp_exporter: { tls: { key_pem: { id: 'key-pem-id' } } } },
      });
    });
  });

  describe('Kafka password', () => {
    const original = { auth_type: 'user_pass', secrets: { password: { id: 'password-id' } } };
    const fields = getOutputSecretFields(outputType.Kafka);

    it('keeps the password when the update does not change the authentication type', () => {
      expect(withSavedSecrets({ fields, original, update: { name: 'renamed' } })).toEqual({
        name: 'renamed',
        secrets: { password: { id: 'password-id' } },
      });
    });

    it('keeps the password when the update names user_pass', () => {
      const update = { auth_type: 'user_pass' };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        ...update,
        secrets: { password: { id: 'password-id' } },
      });
    });

    it('removes the password when the update switches to another authentication type', () => {
      const update = { auth_type: 'ssl' };

      expect(withSavedSecrets({ fields, original, update })).toEqual(update);
    });
  });
});
