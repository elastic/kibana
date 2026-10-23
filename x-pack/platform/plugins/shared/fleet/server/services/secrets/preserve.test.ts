/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecretFieldDefinition } from './preserve';
import { omitNullSecrets, withSavedSecrets } from './preserve';

const SSL_KEY: SecretFieldDefinition = {
  secretPath: 'secrets.ssl.key',
  plainPath: 'ssl.key',
  clearedBy: ['ssl'],
};
const SERVICE_TOKEN: SecretFieldDefinition = {
  secretPath: 'secrets.service_token',
  plainPath: 'service_token',
  clearedBy: ['service_token'],
};
const SECRETS_ONLY: SecretFieldDefinition = { secretPath: 'secrets.otlp_exporter.tls.key_pem' };

describe('withSavedSecrets', () => {
  describe('when the update says nothing about the credential', () => {
    it('keeps the saved secret, so that the diff does not delete it', () => {
      const original = { name: 'output', secrets: { ssl: { key: { id: 'secret-1' } } } };

      expect(
        withSavedSecrets({ fields: [SSL_KEY], original, update: { name: 'renamed' } })
      ).toEqual({ name: 'renamed', secrets: { ssl: { key: { id: 'secret-1' } } } });
    });

    it('keeps the saved secret when the update sends ssl without a key', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { ssl: { certificate: 'CERT' } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual({
        ssl: { certificate: 'CERT' },
        secrets: { ssl: { key: { id: 'secret-1' } } },
      });
    });

    it('keeps a credential that has no plain text counterpart', () => {
      const original = {
        secrets: { otlp_exporter: { tls: { key_pem: { id: 'secret-1' } } } },
      };

      expect(
        withSavedSecrets({ fields: [SECRETS_ONLY], original, update: { name: 'renamed' } })
      ).toEqual({
        name: 'renamed',
        secrets: { otlp_exporter: { tls: { key_pem: { id: 'secret-1' } } } },
      });
    });

    it('keeps every saved secret the update leaves out', () => {
      const original = {
        secrets: { ssl: { key: { id: 'secret-1' } }, service_token: { id: 'secret-2' } },
      };

      expect(
        withSavedSecrets({
          fields: [SSL_KEY, SERVICE_TOKEN],
          original,
          update: { name: 'renamed' },
        })
      ).toEqual({
        name: 'renamed',
        secrets: { ssl: { key: { id: 'secret-1' } }, service_token: { id: 'secret-2' } },
      });
    });

    it('keeps the secrets the update does not name alongside the one it does', () => {
      const original = {
        secrets: { ssl: { key: { id: 'secret-1' } }, service_token: { id: 'secret-2' } },
      };
      const update = { secrets: { service_token: 'NEW TOKEN' } };

      expect(withSavedSecrets({ fields: [SSL_KEY, SERVICE_TOKEN], original, update })).toEqual({
        secrets: { ssl: { key: { id: 'secret-1' } }, service_token: 'NEW TOKEN' },
      });
    });

    it('supports a secret saved as a list of references', () => {
      const original = { secrets: { ssl: { key: { ids: ['secret-1', 'secret-2'] } } } };

      expect(
        withSavedSecrets({ fields: [SSL_KEY], original, update: { name: 'renamed' } })
      ).toEqual({ name: 'renamed', secrets: { ssl: { key: { ids: ['secret-1', 'secret-2'] } } } });
    });
  });

  describe('when the update sends a plain text value', () => {
    it('stores it as a secret and drops the plain text value', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { ssl: { certificate: 'CERT', key: 'PLAIN KEY' } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual({
        ssl: { certificate: 'CERT' },
        secrets: { ssl: { key: 'PLAIN KEY' } },
      });
    });

    it('stores a plain text value at the root of the object as a secret', () => {
      const original = { secrets: { service_token: { id: 'secret-1' } } };

      expect(
        withSavedSecrets({
          fields: [SERVICE_TOKEN],
          original,
          update: { service_token: 'PLAIN TOKEN' },
        })
      ).toEqual({ secrets: { service_token: 'PLAIN TOKEN' } });
    });

    it('leaves a plain text value alone when nothing is stored as a secret', () => {
      const original = { ssl: { key: 'OLD PLAIN KEY' } };
      const update = { ssl: { key: 'NEW PLAIN KEY' } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual(update);
    });

    it('leaves an update that sends both alone, so the validation rejects it', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { ssl: { key: 'PLAIN KEY' }, secrets: { ssl: { key: 'SECRET KEY' } } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual(update);
    });

    it('keeps the saved secret when the plain text value is empty', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { ssl: { key: '' } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual({
        ssl: { key: '' },
        secrets: { ssl: { key: { id: 'secret-1' } } },
      });
    });
  });

  describe('when the update is authoritative', () => {
    it('leaves a new secret alone', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { secrets: { ssl: { key: 'NEW KEY' } } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual(update);
    });

    it('leaves a secret removed with an explicit null alone', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { secrets: { ssl: { key: null } } };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual(update);
    });

    it('leaves the credential alone when the update clears its parent', () => {
      const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
      const update = { ssl: null };

      expect(withSavedSecrets({ fields: [SSL_KEY], original, update })).toEqual(update);
    });

    it('leaves the credential alone when clearedWhen matches the update', () => {
      const original = { secrets: { service_token: { id: 'secret-1' } } };
      const update = { mode: 'other' };
      const field: SecretFieldDefinition = {
        ...SERVICE_TOKEN,
        clearedWhen: (sent) => (sent as { mode?: string }).mode === 'other',
      };

      expect(withSavedSecrets({ fields: [field], original, update })).toEqual(update);
    });

    it('keeps the saved secret when clearedWhen does not match the update', () => {
      const original = { secrets: { service_token: { id: 'secret-1' } } };
      const field: SecretFieldDefinition = { ...SERVICE_TOKEN, clearedWhen: () => false };

      expect(withSavedSecrets({ fields: [field], original, update: { name: 'renamed' } })).toEqual({
        name: 'renamed',
        secrets: { service_token: { id: 'secret-1' } },
      });
    });

    it('leaves the credential alone when the update clears the plain text path', () => {
      const original = { secrets: { service_token: { id: 'secret-1' } } };
      const update = { service_token: null };

      expect(withSavedSecrets({ fields: [SERVICE_TOKEN], original, update })).toEqual(update);
    });
  });

  it('returns the update as it is when there is nothing to keep', () => {
    const update = { name: 'renamed' };

    expect(withSavedSecrets({ fields: [SSL_KEY], original: { name: 'output' }, update })).toBe(
      update
    );
  });

  it('does not modify the update it is given', () => {
    const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };
    const update = { ssl: { key: 'PLAIN KEY' } };

    withSavedSecrets({ fields: [SSL_KEY], original, update });

    expect(update).toEqual({ ssl: { key: 'PLAIN KEY' } });
  });

  it('does not share the saved reference with the original object', () => {
    const original = { secrets: { ssl: { key: { id: 'secret-1' } } } };

    const { secrets } = withSavedSecrets({
      fields: [SSL_KEY],
      original,
      update: {} as { secrets?: { ssl: { key: object } } },
    });

    expect(secrets?.ssl.key).toEqual(original.secrets.ssl.key);
    expect(secrets?.ssl.key).not.toBe(original.secrets.ssl.key);
  });
});

describe('omitNullSecrets', () => {
  it('removes a secret cleared by an update', () => {
    expect(
      omitNullSecrets({
        name: 'output',
        secrets: { ssl: { key: null }, service_token: { id: 'secret-1' } },
      })
    ).toEqual({ name: 'output', secrets: { service_token: { id: 'secret-1' } } });
  });

  it('removes the secrets of an object left without any', () => {
    expect(omitNullSecrets({ name: 'output', secrets: { ssl: { key: null } } })).toEqual({
      name: 'output',
    });
  });

  it('keeps an object that has no secrets as it is', () => {
    const attributes: { name: string; secrets?: unknown } = { name: 'output' };

    expect(omitNullSecrets(attributes)).toBe(attributes);
  });

  it('keeps the secrets of an object that has no cleared one as they are', () => {
    const attributes = { secrets: { ssl: { key: { id: 'secret-1' } } } };

    expect(omitNullSecrets(attributes)).toEqual(attributes);
  });
});
