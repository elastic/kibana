/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputInvalidError } from '../../errors';

import { validateKafkaAuthMethods, validateKafkaKerberos, validateKafkaOAuth2 } from './validators';

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

describe('validateKafkaAuthMethods', () => {
  const incompleteKerberos = kafkaOutput({ auth_type: 'kerberos' });
  const incompleteOAuth2 = kafkaOutput({ auth_type: 'oauth2' });

  it('checks every authentication method', () => {
    expect(() => validateKafkaAuthMethods(incompleteKerberos)).toThrow(
      'kerberos is required when auth_type is kerberos'
    );
    expect(() => validateKafkaAuthMethods(incompleteOAuth2)).toThrow(
      'oauth2 is required when auth_type is oauth2'
    );
  });

  it('does not check the methods that an update keeps as they are', () => {
    expect(() => validateKafkaAuthMethods(incompleteKerberos, ['kerberos'])).not.toThrow();
    expect(() => validateKafkaAuthMethods(incompleteOAuth2, ['oauth2'])).not.toThrow();
    // only the methods it names
    expect(() => validateKafkaAuthMethods(incompleteOAuth2, ['kerberos'])).toThrow();
  });
});

describe('validateKafkaKerberos', () => {
  const keytabKerberos = {
    auth_type: 'keytab',
    config_path: '/etc/krb5.conf',
    keytab: '/etc/kafka.keytab',
    realm: 'EXAMPLE.COM',
  };
  const passwordKerberos = {
    auth_type: 'password',
    config_path: '/etc/krb5.conf',
    username: 'kafka',
    realm: 'EXAMPLE.COM',
  };

  it('accepts the keytab authentication', () => {
    expect(() =>
      validateKafkaKerberos(kafkaOutput({ auth_type: 'kerberos', kerberos: keytabKerberos }))
    ).not.toThrow();
  });

  it('accepts the password authentication with the password as a secret', () => {
    expect(() =>
      validateKafkaKerberos(
        kafkaOutput({
          auth_type: 'kerberos',
          kerberos: passwordKerberos,
          secrets: { kerberos: { password: { id: 'secret-id' } } },
        })
      )
    ).not.toThrow();
  });

  it('ignores the outputs that do not use Kerberos', () => {
    expect(() => validateKafkaKerberos(kafkaOutput({ auth_type: 'ssl' }))).not.toThrow();
    expect(() => validateKafkaKerberos(kafkaOutput({}))).not.toThrow();
    expect(() =>
      validateKafkaKerberos({ name: 'es', type: 'elasticsearch', auth_type: 'kerberos' } as any)
    ).not.toThrow();
  });

  it('requires the kerberos settings', () => {
    expect(() => validateKafkaKerberos(kafkaOutput({ auth_type: 'kerberos' }))).toThrow(
      new OutputInvalidError('kerberos is required when auth_type is kerberos')
    );
  });

  it('requires the path of the configuration and the realm', () => {
    expect(() =>
      validateKafkaKerberos(
        kafkaOutput({ auth_type: 'kerberos', kerberos: { ...keytabKerberos, config_path: '' } })
      )
    ).toThrow(new OutputInvalidError('kerberos.config_path is required'));
    expect(() =>
      validateKafkaKerberos(
        kafkaOutput({ auth_type: 'kerberos', kerberos: { ...keytabKerberos, realm: '' } })
      )
    ).toThrow(new OutputInvalidError('kerberos.realm is required'));
  });

  it('requires a keytab for the keytab authentication', () => {
    expect(() =>
      validateKafkaKerberos(
        kafkaOutput({ auth_type: 'kerberos', kerberos: { ...keytabKerberos, keytab: undefined } })
      )
    ).toThrow(
      new OutputInvalidError('kerberos.keytab is required when kerberos.auth_type is keytab')
    );
  });

  it('requires a username and a password for the password authentication', () => {
    expect(() =>
      validateKafkaKerberos(
        kafkaOutput({
          auth_type: 'kerberos',
          kerberos: { ...passwordKerberos, username: undefined },
          secrets: { kerberos: { password: { id: 'secret-id' } } },
        })
      )
    ).toThrow(
      new OutputInvalidError('kerberos.username is required when kerberos.auth_type is password')
    );
    expect(() =>
      validateKafkaKerberos(kafkaOutput({ auth_type: 'kerberos', kerberos: passwordKerberos }))
    ).toThrow(
      new OutputInvalidError(
        'secrets.kerberos.password is required when kerberos.auth_type is password'
      )
    );
  });
});
