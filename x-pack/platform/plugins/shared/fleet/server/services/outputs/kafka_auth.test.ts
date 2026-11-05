/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kafkaAuthType, kafkaSaslMechanism } from '../../../common/constants';

import {
  buildKafkaAuthData,
  buildKafkaSecrets,
  clearKafkaAuthFieldsForType,
  getRemovedKafkaAuthSecrets,
  keepsKafkaAuth,
  omitKafkaSecretsOfOtherAuthTypes,
  omitRemovedKafkaAuthSecrets,
  omitRemovedKafkaAuthSettings,
  usesKafkaAuth,
  withRemovedKafkaAuthSettings,
  withSavedKafkaAuth,
} from './kafka_auth';

describe('clearKafkaAuthFieldsForType', () => {
  const buildData = () => ({
    connection_type: 'plaintext',
    username: 'user',
    password: 'pass',
    topic: 'topic',
  });

  it('keeps connection_type and clears the credentials for the none auth type', () => {
    const data: Record<string, unknown> = buildData();
    clearKafkaAuthFieldsForType(data, kafkaAuthType.None, undefined);

    expect(data).toEqual({
      connection_type: 'plaintext',
      username: undefined,
      password: undefined,
      topic: 'topic',
    });
  });

  it('keeps the credentials and clears connection_type for the user_pass auth type', () => {
    const data: Record<string, unknown> = buildData();
    clearKafkaAuthFieldsForType(data, kafkaAuthType.Userpass, undefined);

    expect(data).toEqual({
      connection_type: undefined,
      username: 'user',
      password: 'pass',
      topic: 'topic',
    });
  });

  it('clears everything owned by another auth type for the ssl auth type', () => {
    const data: Record<string, unknown> = buildData();
    clearKafkaAuthFieldsForType(data, kafkaAuthType.Ssl, undefined);

    expect(data).toEqual({
      connection_type: undefined,
      username: undefined,
      password: undefined,
      topic: 'topic',
    });
  });

  it('clears everything owned by another auth type for an auth type that owns no field', () => {
    const data: Record<string, unknown> = buildData();
    // an auth type that has no entry in the owned fields
    clearKafkaAuthFieldsForType(data, 'another_auth' as any, undefined);

    expect(data).toEqual({
      connection_type: undefined,
      username: undefined,
      password: undefined,
      topic: 'topic',
    });
  });

  it('explicitly sets the fields to null when asked to', () => {
    const data: Record<string, unknown> = buildData();
    clearKafkaAuthFieldsForType(data, kafkaAuthType.Ssl, null);

    expect(data).toEqual({
      connection_type: null,
      username: null,
      password: null,
      oauth2: null,
      kerberos: null,
      topic: 'topic',
    });
  });

  it('clears all the owned fields when the auth type is not set', () => {
    const data: Record<string, unknown> = buildData();
    clearKafkaAuthFieldsForType(data, undefined, undefined);

    expect(data).toEqual({
      connection_type: undefined,
      username: undefined,
      password: undefined,
      topic: 'topic',
    });
  });

  it('does not touch the sasl mechanism', () => {
    const data: Record<string, unknown> = {
      ...buildData(),
      sasl: { mechanism: kafkaSaslMechanism.Plain },
    };
    clearKafkaAuthFieldsForType(data, kafkaAuthType.Ssl, undefined);
    clearKafkaAuthFieldsForType(data, kafkaAuthType.None, null);

    expect(data.sasl).toEqual({ mechanism: kafkaSaslMechanism.Plain });
  });
});

describe('buildKafkaAuthData', () => {
  it('emits the username, password and sasl of a user_pass output', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.Userpass,
        username: 'user',
        password: 'pass',
        sasl: { mechanism: kafkaSaslMechanism.ScramSha256 },
      })
    ).toEqual({
      username: 'user',
      password: 'pass',
      sasl: { mechanism: kafkaSaslMechanism.ScramSha256 },
    });
  });

  it('emits nothing for an output without credentials', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.Ssl,
        username: null,
        password: undefined,
        sasl: null,
      })
    ).toEqual({});
  });

  it('keeps emitting a sasl set on an ssl or none output, as before', () => {
    const sasl = { mechanism: kafkaSaslMechanism.Plain };

    expect(buildKafkaAuthData({ auth_type: kafkaAuthType.Ssl, sasl })).toEqual({ sasl });
    expect(buildKafkaAuthData({ auth_type: kafkaAuthType.None, sasl })).toEqual({ sasl });
  });

  it('leaves out empty credentials', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.Userpass,
        username: '',
        password: '',
      })
    ).toEqual({});
  });
});

describe('clearKafkaAuthFieldsForType with OAuth2', () => {
  const buildData = () => ({
    connection_type: 'plaintext',
    username: 'user',
    password: 'pass',
    sasl: { mechanism: 'PLAIN' },
    oauth2: { token_url: 'https://idp.example.com' },
    topic: 'topic',
  });

  it('clears the credentials, the sasl mechanism and connection_type for the oauth2 auth type', () => {
    const data: Record<string, unknown> = buildData();
    clearKafkaAuthFieldsForType(data, kafkaAuthType.OAuth2, undefined);

    expect(data).toEqual({
      connection_type: undefined,
      username: undefined,
      password: undefined,
      sasl: undefined,
      oauth2: { token_url: 'https://idp.example.com' },
      topic: 'topic',
    });
  });

  it.each([kafkaAuthType.None, kafkaAuthType.Userpass, kafkaAuthType.Ssl])(
    'clears the oauth2 settings but keeps the sasl mechanism for the %s auth type',
    (authType) => {
      const data: Record<string, unknown> = buildData();
      clearKafkaAuthFieldsForType(data, authType, null);

      expect(data.oauth2).toBeNull();
      expect(data.sasl).toEqual({ mechanism: 'PLAIN' });
    }
  );
});

describe('omitKafkaSecretsOfOtherAuthTypes', () => {
  const secrets = {
    password: { id: 'password-id' },
    ssl: { key: { id: 'key-id' } },
    oauth2: { client_secret: { id: 'client-secret-id' } },
  };

  it('keeps the oauth2 secrets for the oauth2 auth type', () => {
    expect(omitKafkaSecretsOfOtherAuthTypes(secrets, kafkaAuthType.OAuth2)).toEqual(secrets);
  });

  it.each([kafkaAuthType.None, kafkaAuthType.Userpass, kafkaAuthType.Ssl, undefined])(
    'omits the oauth2 secrets and keeps the others for the %s auth type',
    (authType) => {
      expect(omitKafkaSecretsOfOtherAuthTypes(secrets, authType)).toEqual({
        password: { id: 'password-id' },
        ssl: { key: { id: 'key-id' } },
      });
    }
  );

  it('does not modify the given secrets', () => {
    omitKafkaSecretsOfOtherAuthTypes(secrets, kafkaAuthType.Ssl);

    expect(secrets.oauth2).toBeDefined();
  });

  it('returns undefined without secrets', () => {
    expect(omitKafkaSecretsOfOtherAuthTypes(undefined, kafkaAuthType.Ssl)).toBeUndefined();
  });
});

describe('usesKafkaAuth', () => {
  it('is true for the oauth2 auth type, the oauth2 settings or the oauth2 secrets', () => {
    expect(usesKafkaAuth('oauth2', { type: 'kafka', auth_type: 'oauth2' })).toBe(true);
    expect(usesKafkaAuth('oauth2', { type: 'kafka', oauth2: { token_url: 'https://idp' } })).toBe(
      true
    );
    expect(
      usesKafkaAuth('oauth2', { type: 'kafka', secrets: { oauth2: { client_secret: 'secret' } } })
    ).toBe(true);
  });

  it('is false when the oauth2 settings or secrets come with another auth type', () => {
    expect(
      usesKafkaAuth('oauth2', {
        type: 'kafka',
        auth_type: 'ssl',
        oauth2: { token_url: 'https://idp' },
        secrets: { oauth2: { client_secret: { id: 'secret-id' } } },
      })
    ).toBe(false);
  });

  it('is false for any other Kafka output', () => {
    expect(usesKafkaAuth('oauth2', { type: 'kafka', auth_type: 'ssl' })).toBe(false);
    expect(
      usesKafkaAuth('oauth2', { type: 'kafka', oauth2: null, secrets: { password: 'p' } })
    ).toBe(false);
    expect(usesKafkaAuth('oauth2', { type: 'kafka' })).toBe(false);
  });

  it('is false for any other output type', () => {
    expect(usesKafkaAuth('oauth2', { type: 'elasticsearch', auth_type: 'oauth2' })).toBe(false);
    expect(usesKafkaAuth('oauth2', { auth_type: 'oauth2' })).toBe(false);
  });
});

describe('buildKafkaAuthData with OAuth2', () => {
  it('emits the oauthbearer mechanism and the oauth2client settings, without credentials', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.OAuth2,
        username: 'user',
        password: 'pass',
        sasl: { mechanism: kafkaSaslMechanism.Plain },
        oauth2: {
          client_id: 'my-client',
          token_url: 'https://idp.example.com/oauth2/token',
          scopes: ['read', 'write'],
          endpoint_params: { audience: ['kafka'] },
          tls: { ca_file: '/etc/ca.pem', insecure_skip_verify: false },
        },
      })
    ).toEqual({
      sasl: { mechanism: 'OAUTHBEARER' },
      auth: {
        oauth2client: {
          client_id: 'my-client',
          token_url: 'https://idp.example.com/oauth2/token',
          scopes: ['read', 'write'],
          endpoint_params: { audience: ['kafka'] },
          tls: { ca_file: '/etc/ca.pem', insecure_skip_verify: false },
        },
      },
    });
  });

  it('leaves out the settings that are not set', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.OAuth2,
        oauth2: {
          client_id: 'my-client',
          client_id_file: '',
          token_url: 'https://idp.example.com/oauth2/token',
          scopes: [],
          endpoint_params: {},
          tls: {},
        },
      })
    ).toEqual({
      sasl: { mechanism: 'OAUTHBEARER' },
      auth: {
        oauth2client: {
          client_id: 'my-client',
          token_url: 'https://idp.example.com/oauth2/token',
        },
      },
    });
  });

  it('gives the durations to the agent in nanoseconds, it does not convert a text such as 10s', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.OAuth2,
        oauth2: {
          client_id: 'my-client',
          token_url: 'https://idp.example.com/oauth2/token',
          timeout: 10,
          expiry_buffer: 90.5,
        },
      }).auth
    ).toEqual({
      oauth2client: {
        client_id: 'my-client',
        token_url: 'https://idp.example.com/oauth2/token',
        timeout: 10_000_000_000,
        expiry_buffer: 90_500_000_000,
      },
    });
  });

  it('keeps a duration of 0, and leaves out the durations that are not set', () => {
    const emitted = (oauth2: Record<string, unknown>) =>
      (buildKafkaAuthData({ auth_type: kafkaAuthType.OAuth2, oauth2 } as any).auth as any)
        .oauth2client;

    expect(emitted({ token_url: 'https://idp', timeout: 0, expiry_buffer: 0 })).toEqual({
      token_url: 'https://idp',
      timeout: 0,
      expiry_buffer: 0,
    });
    expect(emitted({ token_url: 'https://idp', timeout: null, expiry_buffer: undefined })).toEqual({
      token_url: 'https://idp',
    });
  });

  it('does not emit the oauth2client settings for another auth type', () => {
    expect(
      buildKafkaAuthData({
        auth_type: kafkaAuthType.Userpass,
        username: 'user',
        password: 'pass',
        oauth2: { token_url: 'https://idp.example.com/oauth2/token' },
      })
    ).toEqual({ username: 'user', password: 'pass' });
  });
});

describe('buildKafkaSecrets', () => {
  it('moves the oauth2 secrets where the agent expects the settings they replace', () => {
    expect(
      buildKafkaSecrets({
        auth_type: kafkaAuthType.OAuth2,
        secrets: {
          oauth2: {
            client_secret: { id: 'client-secret-id' },
            client_certificate_key: { id: 'key-id' },
          },
        },
      })
    ).toEqual({
      auth: {
        oauth2client: {
          client_secret: { id: 'client-secret-id' },
          client_certificate_key: { id: 'key-id' },
        },
      },
    });
  });

  it('keeps the other secrets', () => {
    expect(
      buildKafkaSecrets({
        auth_type: kafkaAuthType.OAuth2,
        secrets: { ssl: { key: { id: 'ssl-id' } }, oauth2: { client_secret: { id: 'secret-id' } } },
      })
    ).toEqual({
      ssl: { key: { id: 'ssl-id' } },
      auth: { oauth2client: { client_secret: { id: 'secret-id' } } },
    });
  });

  it('returns undefined when no secret is left', () => {
    expect(buildKafkaSecrets({ auth_type: kafkaAuthType.OAuth2, secrets: { oauth2: {} } })).toBe(
      undefined
    );
  });

  it('returns the secrets as they are for another auth type', () => {
    const secrets = { password: { id: 'password-id' } };

    expect(buildKafkaSecrets({ auth_type: kafkaAuthType.Userpass, secrets })).toBe(secrets);
    expect(buildKafkaSecrets({ auth_type: kafkaAuthType.Ssl, secrets: undefined })).toBe(undefined);
  });
});

describe('getRemovedKafkaAuthSecrets', () => {
  const saved = {
    type: 'kafka',
    secrets: { oauth2: { client_secret: { id: 'secret-id' }, client_certificate_key: null } },
  };

  it('returns a null for each saved secret that the update does not keep', () => {
    expect(getRemovedKafkaAuthSecrets('oauth2', saved, undefined)).toEqual({ client_secret: null });
    expect(getRemovedKafkaAuthSecrets('oauth2', saved, { password: 'pass' })).toEqual({
      client_secret: null,
    });
    expect(
      getRemovedKafkaAuthSecrets(
        'oauth2',
        { type: 'kafka', secrets: { oauth2: { client_secret: { id: 'a' } } } },
        { oauth2: { client_certificate_key: 'KEY' } }
      )
    ).toEqual({ client_secret: null });
  });

  it('returns nothing when the update keeps every saved secret', () => {
    expect(
      getRemovedKafkaAuthSecrets('oauth2', saved, {
        oauth2: { client_secret: { id: 'secret-id' } },
      })
    ).toBeUndefined();
    expect(
      getRemovedKafkaAuthSecrets('oauth2', saved, { oauth2: { client_secret: 'a new secret' } })
    ).toBeUndefined();
  });

  it('returns nothing when the output has no saved OAuth2 secret, or is not a Kafka output', () => {
    expect(getRemovedKafkaAuthSecrets('oauth2', { type: 'kafka' }, undefined)).toBeUndefined();
    expect(
      getRemovedKafkaAuthSecrets(
        'oauth2',
        { type: 'kafka', secrets: { password: { id: 'a' } } },
        {}
      )
    ).toBeUndefined();
    expect(
      getRemovedKafkaAuthSecrets('oauth2', { type: 'kafka', secrets: { oauth2: {} } }, {})
    ).toBe(undefined);
    expect(
      getRemovedKafkaAuthSecrets('oauth2', { ...saved, type: 'logstash' }, undefined)
    ).toBeUndefined();
  });
});

describe('omitRemovedKafkaAuthSecrets', () => {
  it('removes the OAuth2 secrets that an update set to null', () => {
    expect(
      omitRemovedKafkaAuthSecrets('oauth2', {
        name: 'output',
        secrets: {
          password: { id: 'password-id' },
          oauth2: { client_secret: null, client_certificate_key: { id: 'key-id' } },
        },
      })
    ).toEqual({
      name: 'output',
      secrets: {
        password: { id: 'password-id' },
        oauth2: { client_certificate_key: { id: 'key-id' } },
      },
    });
  });

  it('removes the oauth2 secrets when none is left', () => {
    expect(
      omitRemovedKafkaAuthSecrets('oauth2', {
        secrets: { password: { id: 'password-id' }, oauth2: { client_secret: null } },
      })
    ).toEqual({ secrets: { password: { id: 'password-id' } } });
    // no secrets left: the output is as if it never had any
    expect(
      omitRemovedKafkaAuthSecrets('oauth2', {
        name: 'output',
        secrets: { oauth2: { client_secret: null } },
      })
    ).toEqual({ name: 'output' });
  });

  it('does not change the attributes without OAuth2 secrets', () => {
    const withoutOAuth2 = { name: 'output', secrets: { password: { id: 'password-id' } } };
    const withoutSecrets = { name: 'output' };

    expect(omitRemovedKafkaAuthSecrets('oauth2', withoutOAuth2)).toBe(withoutOAuth2);
    expect(omitRemovedKafkaAuthSecrets('oauth2', withoutSecrets)).toBe(withoutSecrets);
  });
});

describe('withSavedKafkaAuth', () => {
  const saved = {
    type: 'kafka',
    auth_type: 'oauth2',
    oauth2: { client_id: 'my-client', token_url: 'https://idp' },
    secrets: { oauth2: { client_secret: { id: 'secret-id' } } },
  };

  it('keeps the saved OAuth2 settings and secrets when the update does not name an auth type', () => {
    expect(withSavedKafkaAuth('oauth2', saved, { name: 'renamed' })).toEqual({
      name: 'renamed',
      oauth2: saved.oauth2,
      secrets: saved.secrets,
    });
  });

  it('keeps the other secrets the update sends', () => {
    expect(withSavedKafkaAuth('oauth2', saved, { secrets: { password: 'pass' } })).toEqual({
      oauth2: saved.oauth2,
      secrets: { password: 'pass', oauth2: saved.secrets.oauth2 },
    });
  });

  it('does not replace what the update sends', () => {
    const update = {
      oauth2: { client_id: 'other', token_url: 'https://other' },
      secrets: { oauth2: { client_secret: 'new secret' } },
    };

    expect(withSavedKafkaAuth('oauth2', saved, update)).toEqual(update);
  });

  it('leaves the update as it is when it names an auth type', () => {
    const update = { auth_type: 'ssl', name: 'renamed' };

    expect(withSavedKafkaAuth('oauth2', saved, update)).toBe(update);
  });

  it('leaves the update as it is for an output that does not use OAuth2', () => {
    const update = { name: 'renamed' };

    expect(withSavedKafkaAuth('oauth2', { type: 'kafka', auth_type: 'ssl' }, update)).toBe(update);
    expect(withSavedKafkaAuth('oauth2', { type: 'logstash' }, update)).toBe(update);
  });
});

describe('keepsKafkaAuth', () => {
  const saved = {
    type: 'kafka',
    auth_type: 'oauth2',
    oauth2: { client_id: 'my-client', token_url: 'https://idp', scopes: ['read'] },
    secrets: { oauth2: { client_secret: { id: 'secret-id' } } },
  };

  it('is true for an edit that sends back the same settings and the saved secrets', () => {
    expect(
      keepsKafkaAuth('oauth2', saved, {
        type: 'kafka',
        auth_type: 'oauth2',
        oauth2: { ...saved.oauth2 },
        secrets: { oauth2: { client_secret: { id: 'secret-id' } } },
      })
    ).toBe(true);
  });

  it('is false when the update leaves out the saved secrets, which would delete them', () => {
    expect(keepsKafkaAuth('oauth2', saved, { type: 'kafka' })).toBe(false);
    expect(
      keepsKafkaAuth('oauth2', saved, {
        type: 'kafka',
        auth_type: 'oauth2',
        oauth2: { ...saved.oauth2 },
      })
    ).toBe(false);
  });

  it('is true without secrets when none are saved', () => {
    expect(
      keepsKafkaAuth(
        'oauth2',
        { type: 'kafka', auth_type: 'oauth2', oauth2: saved.oauth2 },
        { type: 'kafka', auth_type: 'oauth2', oauth2: { ...saved.oauth2 } }
      )
    ).toBe(true);
  });

  it('is false when a setting changes', () => {
    expect(
      keepsKafkaAuth('oauth2', saved, { oauth2: { ...saved.oauth2, client_id: 'another-client' } })
    ).toBe(false);
    expect(
      keepsKafkaAuth('oauth2', saved, {
        oauth2: { client_id: 'my-client', token_url: 'https://idp' },
      })
    ).toBe(false);
  });

  it('is false when a secret is replaced, added or removed', () => {
    expect(keepsKafkaAuth('oauth2', saved, { secrets: { oauth2: { client_secret: 'new' } } })).toBe(
      false
    );
    expect(
      keepsKafkaAuth('oauth2', saved, {
        secrets: { oauth2: { client_secret: { id: 'another-id' } } },
      })
    ).toBe(false);
    expect(
      keepsKafkaAuth('oauth2', saved, {
        secrets: { oauth2: { client_secret: { id: 'secret-id' }, client_certificate_key: 'KEY' } },
      })
    ).toBe(false);
    expect(keepsKafkaAuth('oauth2', saved, { secrets: { oauth2: {} } })).toBe(false);
  });

  it('is false when the output changes of authentication or of type', () => {
    expect(keepsKafkaAuth('oauth2', saved, { auth_type: 'ssl' })).toBe(false);
    expect(keepsKafkaAuth('oauth2', saved, { type: 'logstash' })).toBe(false);
  });

  it('is false for an output that does not use OAuth2 yet', () => {
    expect(
      keepsKafkaAuth('oauth2', { type: 'kafka', auth_type: 'ssl' }, { auth_type: 'oauth2' })
    ).toBe(false);
    expect(keepsKafkaAuth('oauth2', { type: 'kafka' }, {})).toBe(false);
  });
});

describe('withRemovedKafkaAuthSettings', () => {
  const saved = {
    type: 'kafka',
    oauth2: {
      client_id: 'my-client',
      token_url: 'https://idp',
      scopes: ['read'],
      tls: { ca_file: '/ca.pem', insecure_skip_verify: true },
      endpoint_params: { audience: ['kafka'], resource: ['a'] },
    },
  };

  it('sets to null each saved setting that is not sent, as the update merges objects', () => {
    expect(
      withRemovedKafkaAuthSettings('oauth2', saved, {
        client_id: 'my-client',
        token_url: 'https://idp',
        tls: { ca_file: '/ca.pem' },
        endpoint_params: { audience: ['kafka'] },
      })
    ).toEqual({
      client_id: 'my-client',
      token_url: 'https://idp',
      scopes: null,
      tls: { ca_file: '/ca.pem', insecure_skip_verify: null },
      endpoint_params: { audience: ['kafka'], resource: null },
    });
  });

  it('sets to null a whole object that is not sent anymore', () => {
    expect(
      withRemovedKafkaAuthSettings('oauth2', saved, {
        client_id: 'my-client',
        token_url: 'https://idp',
      })
    ).toEqual({
      client_id: 'my-client',
      token_url: 'https://idp',
      scopes: null,
      tls: null,
      endpoint_params: null,
    });
  });

  it('keeps and removes the names that every object inherits, as any other name', () => {
    // own properties, as the ones of a parsed JSON body or of a saved object
    const withNames = (names: string[]) => ({
      client_id: 'my-client',
      token_url: 'https://idp',
      endpoint_params: JSON.parse(
        `{${names.map((name) => `"${name}": ["${name} value"]`).join(',')}}`
      ),
    });
    const own = (object: object, key: string) =>
      Object.getOwnPropertyDescriptor(object, key)?.value;
    const savedWithScopes = {
      type: 'kafka',
      oauth2: { ...withNames(['constructor', '__proto__']), scopes: ['read'] },
    };

    // a setting is removed (the scopes) while the names are kept
    const kept = withNames(['constructor', '__proto__']);
    const merged: any = withRemovedKafkaAuthSettings('oauth2', savedWithScopes, kept);
    expect(merged.scopes).toBeNull();
    expect(own(merged.endpoint_params, '__proto__')).toEqual(['__proto__ value']);
    expect(own(merged.endpoint_params, 'constructor')).toEqual(['constructor value']);

    // a name is removed, and another one is added
    const changed: any = withRemovedKafkaAuthSettings(
      'oauth2',
      savedWithScopes,
      withNames(['__proto__', 'audience'])
    );
    expect(own(changed.endpoint_params, 'constructor')).toBeNull();
    expect(own(changed.endpoint_params, '__proto__')).toEqual(['__proto__ value']);
    expect(own(changed.endpoint_params, 'audience')).toEqual(['audience value']);
    // the objects were not given another prototype
    expect(Object.getPrototypeOf(changed.endpoint_params)).toBe(Object.prototype);
  });

  it('keeps what is sent, and does not touch an update that removes nothing', () => {
    const update = { ...saved.oauth2, scopes: ['write'] };

    expect(withRemovedKafkaAuthSettings('oauth2', saved, update)).toBe(update);
  });

  it('does nothing for an output that has no saved OAuth2 settings', () => {
    const update = { client_id: 'my-client', token_url: 'https://idp' };

    expect(withRemovedKafkaAuthSettings('oauth2', { type: 'kafka' }, update)).toBe(update);
    expect(
      withRemovedKafkaAuthSettings('oauth2', { type: 'logstash', oauth2: saved.oauth2 }, update)
    ).toBe(update);
  });
});

describe('omitRemovedKafkaAuthSettings', () => {
  it('removes the settings that an update set to null', () => {
    expect(
      omitRemovedKafkaAuthSettings('oauth2', {
        name: 'output',
        oauth2: {
          client_id: 'my-client',
          scopes: null,
          tls: { ca_file: '/ca.pem', insecure_skip_verify: null },
          endpoint_params: { audience: ['kafka'], resource: null },
        },
      })
    ).toEqual({
      name: 'output',
      oauth2: {
        client_id: 'my-client',
        tls: { ca_file: '/ca.pem' },
        endpoint_params: { audience: ['kafka'] },
      },
    });
  });

  it('removes a nested object that had only removed settings, and keeps one that was empty', () => {
    expect(
      omitRemovedKafkaAuthSettings('oauth2', {
        oauth2: { client_id: 'my-client', tls: { insecure_skip_verify: null }, claims: {} },
      })
    ).toEqual({ oauth2: { client_id: 'my-client', claims: {} } });
  });

  it('does not change the attributes without OAuth2 settings', () => {
    const withoutOAuth2 = { name: 'output' };
    const nullOAuth2 = { name: 'output', oauth2: null };

    expect(omitRemovedKafkaAuthSettings('oauth2', withoutOAuth2)).toBe(withoutOAuth2);
    expect(omitRemovedKafkaAuthSettings('oauth2', nullOAuth2)).toBe(nullOAuth2);
  });
});

describe('Kerberos authentication', () => {
  const kerberos = {
    auth_type: 'password' as const,
    config_path: '/etc/krb5.conf',
    username: 'kafka',
    service_name: 'kafka',
    realm: 'EXAMPLE.COM',
    enable_krb5_fast: true,
    keytab: '/etc/kafka.keytab',
  };

  describe('buildKafkaAuthData', () => {
    it('emits the kerberos settings of the password authentication, without the keytab, credentials or sasl', () => {
      expect(
        buildKafkaAuthData({
          auth_type: kafkaAuthType.Kerberos,
          username: 'user',
          password: 'pass',
          sasl: { mechanism: kafkaSaslMechanism.Plain },
          kerberos,
        })
      ).toEqual({
        kerberos: {
          enabled: true,
          auth_type: 'password',
          config_path: '/etc/krb5.conf',
          username: 'kafka',
          service_name: 'kafka',
          realm: 'EXAMPLE.COM',
          enable_krb5_fast: true,
        },
      });
    });

    it('emits the keytab, and not the username, of the keytab authentication', () => {
      expect(
        buildKafkaAuthData({
          auth_type: kafkaAuthType.Kerberos,
          kerberos: { ...kerberos, auth_type: 'keytab' },
        })
      ).toEqual({
        kerberos: {
          enabled: true,
          auth_type: 'keytab',
          keytab: '/etc/kafka.keytab',
          config_path: '/etc/krb5.conf',
          service_name: 'kafka',
          realm: 'EXAMPLE.COM',
          enable_krb5_fast: true,
        },
      });
    });

    it('emits nothing for an output with the kerberos type and no settings, e.g. one set up in the advanced YAML', () => {
      expect(buildKafkaAuthData({ auth_type: kafkaAuthType.Kerberos })).toEqual({});
      expect(buildKafkaAuthData({ auth_type: kafkaAuthType.Kerberos, kerberos: null })).toEqual({});
    });

    it('does not emit the kerberos settings left in an output that uses another authentication', () => {
      expect(buildKafkaAuthData({ auth_type: kafkaAuthType.Ssl, kerberos })).toEqual({});
    });
  });

  describe('buildKafkaSecrets', () => {
    it('keeps the kerberos secrets where they are: the agent reads kerberos.password', () => {
      const secrets = { kerberos: { password: { id: 'secret-id' } } };

      expect(buildKafkaSecrets({ auth_type: kafkaAuthType.Kerberos, secrets })).toEqual(secrets);
    });
  });

  describe('clearKafkaAuthFieldsForType', () => {
    it('clears the credentials and the sasl mechanism, and keeps the kerberos settings', () => {
      const data: any = { username: 'user', password: 'pass', sasl: {}, kerberos, oauth2: {} };

      clearKafkaAuthFieldsForType(data, kafkaAuthType.Kerberos, null);

      expect(data).toEqual({
        connection_type: null,
        username: null,
        password: null,
        sasl: null,
        kerberos,
        oauth2: null,
      });
    });

    it('clears the kerberos settings of an output that uses another authentication', () => {
      const data: any = { kerberos };

      clearKafkaAuthFieldsForType(data, kafkaAuthType.Ssl, undefined);

      expect(data.kerberos).toBeUndefined();
    });
  });

  describe('omitKafkaSecretsOfOtherAuthTypes', () => {
    it('keeps the kerberos secrets only for the kerberos authentication', () => {
      const secrets = { kerberos: { password: { id: 'secret-id' } }, password: { id: 'other' } };

      expect(omitKafkaSecretsOfOtherAuthTypes(secrets, kafkaAuthType.Kerberos)).toEqual({
        kerberos: secrets.kerberos,
        password: secrets.password,
      });
      expect(omitKafkaSecretsOfOtherAuthTypes(secrets, kafkaAuthType.Userpass)).toEqual({
        password: secrets.password,
      });
    });
  });

  describe('usesKafkaAuth', () => {
    it('is true for the kerberos auth type, the kerberos settings or the kerberos secrets', () => {
      expect(usesKafkaAuth('kerberos', { type: 'kafka', auth_type: 'kerberos' })).toBe(true);
      expect(usesKafkaAuth('kerberos', { type: 'kafka', kerberos })).toBe(true);
      expect(
        usesKafkaAuth('kerberos', {
          type: 'kafka',
          secrets: { kerberos: { password: { id: 'secret-id' } } },
        })
      ).toBe(true);
    });

    it('is false when the kerberos settings come with another auth type, or for other methods', () => {
      expect(usesKafkaAuth('kerberos', { type: 'kafka', auth_type: 'ssl', kerberos })).toBe(false);
      expect(usesKafkaAuth('kerberos', { type: 'kafka', auth_type: 'oauth2' })).toBe(false);
      expect(usesKafkaAuth('oauth2', { type: 'kafka', auth_type: 'kerberos' })).toBe(false);
    });
  });

  describe('updates of a saved output', () => {
    const original = {
      type: 'kafka',
      auth_type: 'kerberos',
      kerberos,
      secrets: { kerberos: { password: { id: 'secret-id' } } },
    };

    it('keeps the saved settings and secrets when an update does not name the auth type', () => {
      expect(withSavedKafkaAuth('kerberos', original, { name: 'renamed' })).toEqual({
        name: 'renamed',
        kerberos,
        secrets: original.secrets,
      });
    });

    it('does not add the saved settings of the other method', () => {
      expect(withSavedKafkaAuth('oauth2', original, { name: 'renamed' })).toEqual({
        name: 'renamed',
      });
    });

    it('keeps the authentication when the settings and the secret references are the same', () => {
      expect(keepsKafkaAuth('kerberos', original, { kerberos, secrets: original.secrets })).toBe(
        true
      );
    });

    it('does not keep the authentication when the update leaves out the saved secrets', () => {
      expect(keepsKafkaAuth('kerberos', original, { auth_type: 'kerberos', kerberos })).toBe(false);
    });

    it('keeps an output with the kerberos type and no settings, which has no secrets to lose', () => {
      expect(
        keepsKafkaAuth(
          'kerberos',
          { type: 'kafka', auth_type: 'kerberos' },
          { type: 'kafka', auth_type: 'kerberos' }
        )
      ).toBe(true);
    });

    it('does not keep the authentication when a setting or the secret changes', () => {
      expect(
        keepsKafkaAuth('kerberos', original, { kerberos: { ...kerberos, realm: 'OTHER.COM' } })
      ).toBe(false);
      expect(
        keepsKafkaAuth('kerberos', original, {
          secrets: { kerberos: { password: { id: 'another-secret' } } },
        })
      ).toBe(false);
    });

    it('removes the settings that are no longer sent, as the update merges objects', () => {
      const { keytab, ...withoutKeytab } = kerberos;

      expect(withRemovedKafkaAuthSettings('kerberos', original, withoutKeytab)).toEqual({
        ...withoutKeytab,
        keytab: null,
      });
    });

    it('removes the reference of a secret that is no longer sent', () => {
      expect(getRemovedKafkaAuthSecrets('kerberos', original, {})).toEqual({ password: null });
      expect(getRemovedKafkaAuthSecrets('kerberos', original, original.secrets)).toBeUndefined();
    });

    it('omits the settings and secrets set to null from a saved output', () => {
      expect(
        omitRemovedKafkaAuthSettings('kerberos', { kerberos: { ...kerberos, keytab: null } })
      ).toEqual({ kerberos: { ...kerberos, keytab: undefined } });
      expect(
        omitRemovedKafkaAuthSecrets('kerberos', { secrets: { kerberos: { password: null } } })
      ).toEqual({});
    });
  });
});
