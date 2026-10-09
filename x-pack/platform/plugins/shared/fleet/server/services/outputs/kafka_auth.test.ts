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
  omitKafkaSecretsOfOtherAuthTypes,
  usesKafkaOAuth2,
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

describe('usesKafkaOAuth2', () => {
  it('is true for the oauth2 auth type, the oauth2 settings or the oauth2 secrets', () => {
    expect(usesKafkaOAuth2({ type: 'kafka', auth_type: 'oauth2' })).toBe(true);
    expect(usesKafkaOAuth2({ type: 'kafka', oauth2: { token_url: 'https://idp' } })).toBe(true);
    expect(
      usesKafkaOAuth2({ type: 'kafka', secrets: { oauth2: { client_secret: 'secret' } } })
    ).toBe(true);
  });

  it('is false for any other Kafka output', () => {
    expect(usesKafkaOAuth2({ type: 'kafka', auth_type: 'ssl' })).toBe(false);
    expect(usesKafkaOAuth2({ type: 'kafka', oauth2: null, secrets: { password: 'p' } })).toBe(
      false
    );
    expect(usesKafkaOAuth2({ type: 'kafka' })).toBe(false);
  });

  it('is false for any other output type', () => {
    expect(usesKafkaOAuth2({ type: 'elasticsearch', auth_type: 'oauth2' })).toBe(false);
    expect(usesKafkaOAuth2({ auth_type: 'oauth2' })).toBe(false);
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
