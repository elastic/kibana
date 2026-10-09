/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kafkaAuthType, kafkaSaslMechanism } from '../../../common/constants';

import { buildKafkaAuthData, clearKafkaAuthFieldsForType } from './kafka_auth';

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
