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
  extractAndWriteFleetServerHostsSecrets,
  extractAndUpdateFleetServerHostsSecrets,
  deleteFleetServerHostsSecrets,
} from './fleet_server_hosts';

describe('Fleet server hosts secrets', () => {
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
  const fleetServerHost = {
    id: 'id1',
    name: 'fleet server 1',
    host_urls: [],
    is_default: false,
    is_preconfigured: false,
    ssl: {
      certificate_authorities: ['cert authorities'],
      es_certificate_authorities: ['es cert authorities'],
      certificate: 'path/to/cert',
      es_certificate: 'path/to/EScert',
    },
    secrets: {
      ssl: {
        key: 'key1',
        es_key: 'key2',
      },
    },
  };

  describe('extractAndWriteFleetServerHostsSecrets', () => {
    it('should create new secrets', async () => {
      const res = await extractAndWriteFleetServerHostsSecrets({
        fleetServerHost,
        esClient: esClientMock,
      });
      expect(res.fleetServerHost).toEqual({
        ...fleetServerHost,
        secrets: {
          ssl: {
            es_key: {
              id: expect.any(String),
            },
            key: {
              id: expect.any(String),
            },
          },
        },
      });
      expect(res.secretReferences).toEqual([{ id: expect.anything() }, { id: expect.anything() }]);
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            body: {
              value: 'key1',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
        [
          {
            body: {
              value: 'key2',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
      ]);
    });
  });

  describe('extractAndUpdateFleetServerHostsSecrets', () => {
    it('should update existing secrets', async () => {
      const updatedFleetServerHost = {
        ...fleetServerHost,
        secrets: {
          ssl: {
            key: 'newkey1',
            es_key: 'newkey2',
          },
        },
      };
      const res = await extractAndUpdateFleetServerHostsSecrets({
        oldFleetServerHost: fleetServerHost,
        fleetServerHostUpdate: updatedFleetServerHost,
        esClient: esClientMock,
      });
      expect(res.fleetServerHostUpdate).toEqual({
        ...fleetServerHost,
        secrets: {
          ssl: {
            es_key: {
              id: expect.any(String),
            },
            key: {
              id: expect.any(String),
            },
          },
        },
      });
      expect(res.secretReferences).toEqual([{ id: expect.anything() }, { id: expect.anything() }]);
      expect(res.secretsToDelete).toEqual([{ id: undefined }, { id: undefined }]);
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            body: {
              value: 'newkey1',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
        [
          {
            body: {
              value: 'newkey2',
            },
            method: 'POST',
            path: '/_fleet/secret',
          },
        ],
      ]);
    });
  });
  describe('deleteFleetServerHostsSecrets', () => {
    it('should delete existing secrets', async () => {
      const fleetServerHostWithSecrets = {
        ...fleetServerHost,
        secrets: {
          ssl: {
            key: {
              id: '7jCKYZUBBY96FE7DX6L1',
            },
            es_key: {
              id: 'WjCKYZ9BBY96FE7DH6P3',
            },
          },
        },
      } as any;

      await deleteFleetServerHostsSecrets({
        fleetServerHost: fleetServerHostWithSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
          },
        ],
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/WjCKYZ9BBY96FE7DH6P3',
          },
        ],
      ]);
    });

    it('should do nothing if there are no existing secrets', async () => {
      const fleetServerHostWithoutSecrets = {
        id: 'id1',
        name: 'fleet server 1',
        host_urls: [],
        is_default: false,
        is_preconfigured: false,
        ssl: {
          certificate_authorities: ['cert authorities'],
          es_certificate_authorities: ['es cert authorities'],
          certificate: 'path/to/cert',
          es_certificate: 'path/to/EScert',
          key: 'key1',
        },
      } as any;

      await deleteFleetServerHostsSecrets({
        fleetServerHost: fleetServerHostWithoutSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([]);
    });
  });
});
