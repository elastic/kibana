/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';

import {
  extractAndWriteOutputSecrets,
  extractAndUpdateOutputSecrets,
  deleteOutputSecrets,
} from './outputs';

describe('Outputs secrets', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  const esClientMock = elasticsearchServiceMock.createInternalClient();
  esClientMock.transport.request.mockImplementation(async (req) => {
    return {
      id: uuidv4(),
    };
  });

  beforeEach(() => {
    // prevents `Logger not set.` and other appContext errors
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);

    esClientMock.transport.request.mockClear();
  });

  const remoteEsOutput = {
    name: 'Remote es output',
    type: 'remote_elasticsearch',
    hosts: ['http://192.168.178.216:9200'],
    is_default: false,
    is_default_monitoring: false,
    preset: 'balanced',
    config_yaml: '',
    secrets: {
      service_token: 'token1',
      ssl: {
        key: 'key1',
      },
    },
    proxy_id: null,
  } as any;

  const otlpOutput = {
    name: 'OTLP output',
    type: 'otlp',
    is_default: false,
    is_default_monitoring: false,
    otlp_exporter: {
      endpoint: 'https://otel.example.com:4317',
      protocol: 'grpc',
    },
    secrets: {
      otlp_exporter: {
        tls: {
          key_pem: 'my-key-pem',
          tpm: {
            owner_auth: 'my-owner-auth',
            auth: 'my-auth',
          },
        },
      },
    },
  } as any;

  describe('extractAndWriteOutputSecrets', () => {
    it('should create secrets', async () => {
      const result = await extractAndWriteOutputSecrets({
        output: remoteEsOutput,
        esClient: esClientMock,
      });

      expect(result.output).toEqual({
        ...remoteEsOutput,
        secrets: {
          service_token: {
            id: expect.any(String),
          },
          ssl: {
            key: {
              id: expect.any(String),
            },
          },
        },
      });
      expect(result.secretReferences).toEqual([
        { id: expect.anything() },
        { id: expect.anything() },
      ]);
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            body: {
              value: 'token1',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
        [
          {
            body: {
              value: 'key1',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
      ]);
    });

    it('should create OTLP secrets for key_pem and tpm credentials', async () => {
      const result = await extractAndWriteOutputSecrets({
        output: otlpOutput,
        esClient: esClientMock,
      });

      expect(result.output).toEqual({
        ...otlpOutput,
        secrets: {
          otlp_exporter: {
            tls: {
              key_pem: { id: expect.any(String) },
              tpm: {
                owner_auth: { id: expect.any(String) },
                auth: { id: expect.any(String) },
              },
            },
          },
        },
      });
      expect(result.secretReferences).toEqual([
        { id: expect.anything() },
        { id: expect.anything() },
        { id: expect.anything() },
      ]);
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [{ body: { value: 'my-key-pem' }, method: 'POST', path: '/_fleet/secret' }],
        [{ body: { value: 'my-owner-auth' }, method: 'POST', path: '/_fleet/secret' }],
        [{ body: { value: 'my-auth' }, method: 'POST', path: '/_fleet/secret' }],
      ]);
    });
  });

  describe('extractAndUpdateOutputSecrets', () => {
    it('should delete secret if type changed from kafka to remote es', async () => {
      const result = await extractAndUpdateOutputSecrets({
        oldOutput: {
          id: 'id1',
          name: 'kafka to remote es',
          is_default: false,
          is_default_monitoring: false,
          type: 'kafka',
          secrets: {
            password: {
              id: 'pass',
            },
          },
        },
        outputUpdate: {
          name: 'kafka to remote es',
          type: 'remote_elasticsearch',
          hosts: ['http://192.168.178.216:9200'],
          is_default: false,
          is_default_monitoring: false,
          preset: 'balanced',
          config_yaml: '',
          secrets: {
            service_token: 'token1',
          },
          proxy_id: null,
        },
        esClient: esClientMock,
      });

      expect(result.secretsToDelete).toEqual([{ id: 'pass' }]);
    });

    it('should delete secret if type changed from remote es to kafka', async () => {
      const result = await extractAndUpdateOutputSecrets({
        oldOutput: {
          id: 'id2',
          name: 'remote es to kafka',
          is_default: false,
          is_default_monitoring: false,
          type: 'remote_elasticsearch',
          secrets: {
            service_token: {
              id: 'token',
            },
          },
        },
        outputUpdate: {
          name: 'remote es to kafka',
          type: 'kafka',
          is_default: false,
          is_default_monitoring: false,
          preset: 'balanced',
          config_yaml: '',
          secrets: {
            password: 'pass',
          },
          proxy_id: null,
        },
        esClient: esClientMock,
      });

      expect(result.secretsToDelete).toEqual([{ id: 'token' }]);
    });

    it('should delete secret if secret is undefined in update', async () => {
      const result = await extractAndUpdateOutputSecrets({
        oldOutput: {
          id: 'logstash-id',
          name: 'logstash',
          type: 'logstash',
          is_default: false,
          is_default_monitoring: false,
          secrets: {
            ssl: {
              key: {
                id: 'ssl-key-token',
              },
            },
          },
        },
        outputUpdate: {
          id: 'logstash-id',
          name: 'logstash',
          type: 'logstash',
          secrets: {
            ssl: undefined,
          },
          is_default: false,
          is_default_monitoring: false,
          proxy_id: null,
        },
        esClient: esClientMock,
      });

      expect(result.secretsToDelete).toEqual([{ id: 'ssl-key-token' }]);
    });

    it('should delete OTLP key_pem secret when replaced by tpm credentials', async () => {
      const result = await extractAndUpdateOutputSecrets({
        oldOutput: {
          id: 'otlp-id',
          name: 'OTLP output',
          type: 'otlp',
          is_default: false,
          is_default_monitoring: false,
          otlp_exporter: { endpoint: 'https://otel.example.com:4317', protocol: 'grpc' },
          secrets: {
            otlp_exporter: {
              tls: {
                key_pem: { id: 'old-key-pem-id' },
              },
            },
          },
        },
        outputUpdate: {
          type: 'otlp',
          otlp_exporter: { endpoint: 'https://otel.example.com:4317', protocol: 'grpc' },
          secrets: {
            otlp_exporter: {
              tls: {
                tpm: { owner_auth: 'new-owner-auth', auth: 'new-auth' },
              },
            },
          },
        },
        esClient: esClientMock,
      });

      expect(result.secretsToDelete).toEqual([{ id: 'old-key-pem-id' }]);
      expect(result.secretReferences).toEqual([
        { id: expect.anything() },
        { id: expect.anything() },
      ]);
    });
  });

  describe('deleteOutputSecrets', () => {
    it('should delete existing secrets', async () => {
      const outputWithSecrets = {
        ...remoteEsOutput,
        secrets: {
          ssl: {
            key: {
              id: '7jCKYZUBBY96FE7DX6L1',
            },
          },
          service_token: {
            id: 'WjCKYZ9BBY96FE7DH6P3',
          },
        },
      } as any;

      await deleteOutputSecrets({
        output: outputWithSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/WjCKYZ9BBY96FE7DH6P3',
          },
        ],
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
          },
        ],
      ]);
    });

    it('should delete all OTLP TLS secrets', async () => {
      const otlpOutputWithSecrets = {
        id: 'otlp-id',
        name: 'OTLP output',
        type: 'otlp',
        is_default: false,
        is_default_monitoring: false,
        otlp_exporter: { endpoint: 'https://otel.example.com:4317', protocol: 'grpc' },
        secrets: {
          otlp_exporter: {
            tls: {
              key_pem: { id: 'key-pem-secret-id' },
              tpm: {
                owner_auth: { id: 'owner-auth-secret-id' },
                auth: { id: 'auth-secret-id' },
              },
            },
          },
        },
      } as any;

      await deleteOutputSecrets({
        output: otlpOutputWithSecrets,
        esClient: esClientMock,
      });

      expect(esClientMock.transport.request.mock.calls).toEqual(
        expect.arrayContaining([
          [{ method: 'DELETE', path: '/_fleet/secret/key-pem-secret-id' }],
          [{ method: 'DELETE', path: '/_fleet/secret/owner-auth-secret-id' }],
          [{ method: 'DELETE', path: '/_fleet/secret/auth-secret-id' }],
        ])
      );
      expect(esClientMock.transport.request.mock.calls).toHaveLength(3);
    });

    it('should do nothing if there are no existing secrets', async () => {
      const outputWithoutSecrets = {
        id: 'id2',
        name: 'ES',
        is_default: false,
        is_default_monitoring: false,
        type: 'elasticsearch',
      } as any;

      await deleteOutputSecrets({
        output: outputWithoutSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([]);
    });
  });
});
