/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output } from '../../../common/types';
import { OUTPUT_ENCRYPTED_FIELDS } from '../../saved_objects';

import { sanitizeOutput } from './sanitize_settings_objects';

describe('sanitize settings objects', () => {
  // Fields handled by the sanitizer below. If this fails, a field was added to the encrypted
  // attributes of the output saved object: update the sanitizer, then this list.
  it('covers every encrypted saved object field', () => {
    expect([...OUTPUT_ENCRYPTED_FIELDS].map((f) => f.key).sort()).toEqual(['password', 'ssl']);
  });

  describe('sanitizeOutput', () => {
    it('removes keys, tokens and secret references from a remote elasticsearch output', () => {
      const output = {
        id: 'remote',
        name: 'Remote',
        type: 'remote_elasticsearch',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['https://remote:9200'],
        service_token: 'service-token',
        ssl: { certificate: 'cert', certificate_authorities: ['ca'], key: 'ssl-key' },
        secrets: { service_token: { id: 'secret-id' }, ssl: { key: { id: 'secret-key-id' } } },
      } as Output;

      expect(sanitizeOutput(output)).toEqual({
        id: 'remote',
        name: 'Remote',
        type: 'remote_elasticsearch',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['https://remote:9200'],
        ssl: { certificate: 'cert', certificate_authorities: ['ca'] },
      });
    });

    it('removes the password and headers from a kafka output', () => {
      const output = {
        id: 'kafka',
        name: 'Kafka',
        type: 'kafka',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['kafka:9092'],
        auth_type: 'user_pass',
        username: 'user',
        password: 'kafka-password',
        headers: [{ key: 'Authorization', value: 'Bearer kafka-token' }],
        secrets: { password: { id: 'secret-id' } },
      } as Output;

      expect(sanitizeOutput(output)).toEqual({
        id: 'kafka',
        name: 'Kafka',
        type: 'kafka',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['kafka:9092'],
        auth_type: 'user_pass',
        username: 'user',
      });
    });

    it('does not change an output without sensitive fields', () => {
      const output = {
        id: 'es',
        name: 'ES',
        type: 'elasticsearch',
        is_default: true,
        is_default_monitoring: true,
        hosts: ['https://es:9200'],
      } as Output;

      expect(sanitizeOutput(output)).toEqual(output);
    });

    it('does not mutate the original output', () => {
      const output = {
        id: 'es',
        type: 'elasticsearch',
        ssl: { key: 'ssl-key' },
      } as Output;

      sanitizeOutput(output);

      expect(output).toEqual({ id: 'es', type: 'elasticsearch', ssl: { key: 'ssl-key' } });
    });
  });
});
