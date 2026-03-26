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
