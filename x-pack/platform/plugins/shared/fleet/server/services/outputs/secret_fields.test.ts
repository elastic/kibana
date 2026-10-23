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

    it('removes the TPM credentials, and only those, when the TPM settings are cleared', () => {
      const update = { otlp_exporter: { tls: { tpm: null } } };

      expect(withSavedSecrets({ fields, original, update })).toEqual({
        ...update,
        secrets: { otlp_exporter: { tls: { key_pem: { id: 'key-pem-id' } } } },
      });
    });
  });
});
