/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownloadSource, FleetServerHost, Output } from '../../../common/types';
import {
  DOWNLOAD_SOURCE_ENCRYPTED_FIELDS,
  FLEET_SERVER_HOST_ENCRYPTED_FIELDS,
  OUTPUT_ENCRYPTED_FIELDS,
} from '../../saved_objects';

import {
  sanitizeDownloadSource,
  sanitizeFleetServerHost,
  sanitizeOutput,
} from './sanitize_settings_objects';

describe('sanitize settings objects', () => {
  // Fields handled by the sanitizers below. If this fails, a field was added to the encrypted
  // attributes of a saved object: update the matching sanitizer, then this list.
  it('covers every encrypted saved object field', () => {
    expect([...OUTPUT_ENCRYPTED_FIELDS].map((f) => f.key).sort()).toEqual([
      'kibana_api_key',
      'password',
      'ssl',
    ]);
    expect([...DOWNLOAD_SOURCE_ENCRYPTED_FIELDS].map((f) => f.key).sort()).toEqual(['auth', 'ssl']);
    expect([...FLEET_SERVER_HOST_ENCRYPTED_FIELDS].map((f) => f.key).sort()).toEqual(['ssl']);
  });

  describe('sanitizeOutput', () => {
    it('removes keys and tokens from a remote elasticsearch output', () => {
      const output = {
        id: 'remote',
        name: 'Remote',
        type: 'remote_elasticsearch',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['https://remote:9200'],
        service_token: 'service-token',
        kibana_url: 'https://remote-kibana:5601',
        kibana_api_key: 'kibana-api-key',
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
        kibana_url: 'https://remote-kibana:5601',
        ssl: { certificate: 'cert', certificate_authorities: ['ca'] },
      });
    });

    it('removes the password from a kafka output', () => {
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

  describe('sanitizeDownloadSource', () => {
    it('removes keys, credentials and header values', () => {
      const downloadSource: DownloadSource = {
        id: 'source',
        name: 'Source',
        host: 'https://artifacts.example.com',
        is_default: false,
        ssl: { certificate: 'cert', key: 'ssl-key' },
        auth: {
          username: 'user',
          password: 'password',
          api_key: 'api-key',
          headers: [{ key: 'X-Custom', value: 'header-value' }],
        },
        secrets: { ssl: { key: { id: 'secret-id' } } },
      };

      expect(sanitizeDownloadSource(downloadSource)).toEqual({
        id: 'source',
        name: 'Source',
        host: 'https://artifacts.example.com',
        is_default: false,
        ssl: { certificate: 'cert' },
        auth: { username: 'user' },
      });
    });
  });

  describe('sanitizeFleetServerHost', () => {
    it('removes keys', () => {
      const host: FleetServerHost = {
        id: 'host',
        name: 'Host',
        host_urls: ['https://fleet:8220'],
        is_default: false,
        is_preconfigured: false,
        ssl: {
          certificate: 'cert',
          key: 'key',
          es_certificate: 'es-cert',
          es_key: 'es-key',
          agent_certificate: 'agent-cert',
          agent_key: 'agent-key',
        },
        secrets: { ssl: { key: { id: 'secret-id' } } },
      };

      expect(sanitizeFleetServerHost(host)).toEqual({
        id: 'host',
        name: 'Host',
        host_urls: ['https://fleet:8220'],
        is_default: false,
        is_preconfigured: false,
        ssl: {
          certificate: 'cert',
          es_certificate: 'es-cert',
          agent_certificate: 'agent-cert',
        },
      });
    });
  });
});
