/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputInvalidError } from '../../errors';

import { ensureSecretStorageForOAuth2Secrets, validateKafkaOAuth2 } from './validators';

const kafkaOutput = (fields: Record<string, unknown>) =>
  ({
    name: 'kafka',
    type: 'kafka',
    hosts: ['localhost:9092'],
    is_default: false,
    is_default_monitoring: false,
    ...fields,
  } as any);

describe('validateKafkaOAuth2', () => {
  const oauth2 = {
    client_id: 'my-client',
    token_url: 'https://idp.example.com/oauth2/token',
  };

  it('accepts a client id, a client secret and a token url', () => {
    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2,
          secrets: { oauth2: { client_secret: { id: 'secret-id' } } },
        })
      )
    ).not.toThrow();
  });

  it('accepts the files of the client id and of the client secret', () => {
    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2: {
            client_id_file: '/etc/client_id',
            client_secret_file: '/etc/client_secret',
            token_url: oauth2.token_url,
          },
        })
      )
    ).not.toThrow();
  });

  it('ignores the outputs that do not use OAuth2', () => {
    expect(() => validateKafkaOAuth2(kafkaOutput({ auth_type: 'ssl' }))).not.toThrow();
    expect(() => validateKafkaOAuth2(kafkaOutput({}))).not.toThrow();
    expect(() =>
      validateKafkaOAuth2({ name: 'es', type: 'elasticsearch', auth_type: 'oauth2' } as any)
    ).not.toThrow();
  });

  it('requires the oauth2 settings', () => {
    expect(() => validateKafkaOAuth2(kafkaOutput({ auth_type: 'oauth2' }))).toThrow(
      new OutputInvalidError('oauth2 is required when auth_type is oauth2')
    );
  });

  it('requires a client id', () => {
    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2: { token_url: oauth2.token_url },
          secrets: { oauth2: { client_secret: 'secret' } },
        })
      )
    ).toThrow('oauth2.client_id or oauth2.client_id_file is required');
  });

  it('requires a client secret for the client credentials grant', () => {
    expect(() => validateKafkaOAuth2(kafkaOutput({ auth_type: 'oauth2', oauth2 }))).toThrow(
      'secrets.oauth2.client_secret or oauth2.client_secret_file is required'
    );
    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2: { ...oauth2, grant_type: 'client_credentials' },
        })
      )
    ).toThrow('secrets.oauth2.client_secret or oauth2.client_secret_file is required');
  });

  it('requires a client certificate key, and no client secret, for the jwt-bearer grant', () => {
    const jwtOauth2 = { ...oauth2, grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer' };

    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2: jwtOauth2,
          secrets: { oauth2: { client_secret: 'secret' } },
        })
      )
    ).toThrow(
      'secrets.oauth2.client_certificate_key or oauth2.client_certificate_key_file is required for the jwt-bearer grant'
    );
    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2: jwtOauth2,
          secrets: { oauth2: { client_certificate_key: { id: 'key-id' } } },
        })
      )
    ).not.toThrow();
    expect(() =>
      validateKafkaOAuth2(
        kafkaOutput({
          auth_type: 'oauth2',
          oauth2: { ...jwtOauth2, client_certificate_key_file: '/etc/key.pem' },
        })
      )
    ).not.toThrow();
  });
});

describe('ensureSecretStorageForOAuth2Secrets', () => {
  it('throws when the output has an OAuth2 secret', () => {
    expect(() =>
      ensureSecretStorageForOAuth2Secrets(
        kafkaOutput({ secrets: { oauth2: { client_secret: 'secret' } } })
      )
    ).toThrow(OutputInvalidError);
    expect(() =>
      ensureSecretStorageForOAuth2Secrets(
        kafkaOutput({ secrets: { oauth2: { client_certificate_key: 'key' } } })
      )
    ).toThrow(OutputInvalidError);
  });

  it('accepts an output without OAuth2 secrets', () => {
    expect(() =>
      ensureSecretStorageForOAuth2Secrets(kafkaOutput({ secrets: { password: 'pass' } }))
    ).not.toThrow();
    expect(() => ensureSecretStorageForOAuth2Secrets(kafkaOutput({}))).not.toThrow();
    expect(() =>
      ensureSecretStorageForOAuth2Secrets({
        name: 'es',
        type: 'elasticsearch',
        secrets: { oauth2: { client_secret: 'secret' } },
      } as any)
    ).not.toThrow();
  });
});
