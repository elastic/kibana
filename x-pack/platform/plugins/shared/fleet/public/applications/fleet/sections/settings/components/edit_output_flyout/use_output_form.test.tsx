/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractDefaultDynamicKafkaTopics,
  extractDefaultStaticKafkaTopic,
  extractKafkaOutputSecrets,
  getSecretToSend,
} from './use_output_form';

describe('use_output_form', () => {
  describe('extractDefaultDynamicKafkaTopics', () => {
    it('should return empty array if not topic are passed', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
      });

      expect(res).toEqual([]);
    });

    it('should return empty array if topic do not include %{[', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: 'something',
      });

      expect(res).toEqual([]);
    });

    it('should return options for combobox if topic include %{[', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[default.dataset]}',
      });

      expect(res).toEqual([
        {
          label: 'default.dataset',
          value: '%{[default.dataset]}',
        },
      ]);
    });

    it('should return options for combobox if topic include %{[ and some special characters', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[@timestamp]}',
      });

      expect(res).toEqual([
        {
          label: '@timestamp',
          value: '%{[@timestamp]}',
        },
      ]);
    });

    it('should return options for combobox if topic include %{[ and a custom name', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[something]}',
      });

      expect(res).toEqual([
        {
          label: 'something',
          value: '%{[something]}',
        },
      ]);
    });

    it('should return the full expression as label and value for multi-token topics', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[data_stream.type]}-%{[data_stream.namespace]}',
      });

      expect(res).toEqual([
        {
          label: '%{[data_stream.type]}-%{[data_stream.namespace]}',
          value: '%{[data_stream.type]}-%{[data_stream.namespace]}',
        },
      ]);
    });
  });

  describe('extractDefaultStaticKafkaTopic', () => {
    it('should return empty array if not topic are passed', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
      });

      expect(res).toEqual('');
    });

    it('should return empty string if topic include %{[', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[something]}',
      });

      expect(res).toEqual('');
    });

    it('should return the topic if topic field is defined', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: 'something',
      });

      expect(res).toEqual('something');
    });
  });

  describe('getSecretToSend', () => {
    it('sends the secret value when there is no plain text value', () => {
      expect(getSecretToSend('', 'NEW SECRET', { id: 'stored' })).toEqual('NEW SECRET');
      expect(getSecretToSend('', { id: 'stored' }, { id: 'stored' })).toEqual({ id: 'stored' });
    });

    it('removes a stored secret the user cleared', () => {
      expect(getSecretToSend('', '', { id: 'stored' })).toBeNull();
      expect(getSecretToSend(undefined, undefined, { id: 'stored' })).toBeNull();
    });

    it('removes a stored secret the user replaced with a plain text value', () => {
      expect(getSecretToSend('PLAIN', '', { id: 'stored' })).toBeNull();
    });

    it('sends nothing when there is no secret value and nothing is stored', () => {
      expect(getSecretToSend('', '', undefined)).toBeUndefined();
      expect(getSecretToSend('PLAIN', '', undefined)).toBeUndefined();
    });
  });

  describe('extractKafkaOutputSecrets', () => {
    const givenInputs = ({
      sslKey = '',
      sslKeySecret,
      password = '',
      passwordSecret,
    }: {
      sslKey?: string;
      sslKeySecret?: string | { id: string };
      password?: string;
      passwordSecret?: string | { id: string };
    }) =>
      ({
        kafkaSslKeyInput: { value: sslKey },
        kafkaSslKeySecretInput: { value: sslKeySecret },
        kafkaAuthPasswordInput: { value: password },
        kafkaAuthPasswordSecretInput: { value: passwordSecret },
      } as unknown as Parameters<typeof extractKafkaOutputSecrets>[0]);

    it('returns null when there is no secret to send', () => {
      expect(extractKafkaOutputSecrets(givenInputs({}))).toBeNull();
    });

    it('sends the secret values', () => {
      expect(
        extractKafkaOutputSecrets(
          givenInputs({ sslKeySecret: 'SSL KEY', passwordSecret: { id: 'stored-password' } }),
          undefined,
          { password: { id: 'stored-password' } }
        )
      ).toEqual({ ssl: { key: 'SSL KEY' }, password: { id: 'stored-password' } });
    });

    it('removes the stored secrets the user cleared', () => {
      expect(
        extractKafkaOutputSecrets(
          givenInputs({ sslKeySecret: '', passwordSecret: '' }),
          undefined,
          {
            ssl: { key: { id: 'stored-ssl-key' } },
            password: { id: 'stored-password' },
          }
        )
      ).toEqual({ ssl: { key: null }, password: null });
    });
  });
});
