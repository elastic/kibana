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
  extractAndWriteDownloadSourcesSecrets,
  extractAndUpdateDownloadSourceSecrets,
  deleteDownloadSourceSecrets,
} from './download_sources';

describe('Download source secrets', () => {
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

  const downloadSource = {
    id: 'id1',
    name: 'Agent binary',
    host: 'https://binary-source-test',
    is_default: false,
    ssl: {
      certificate_authorities: ['cert authorities'],
      certificate: 'path/to/cert',
    },
    secrets: {
      ssl: {
        key: 'key1',
      },
    },
  };
  describe('extractAndWriteDownloadSourcesSecrets', () => {
    it('should create new secrets', async () => {
      const res = await extractAndWriteDownloadSourcesSecrets({
        downloadSource,
        esClient: esClientMock,
      });
      expect(res.downloadSource).toEqual({
        ...downloadSource,
        secrets: {
          ssl: {
            key: {
              id: expect.any(String),
            },
          },
        },
      });
      expect(res.secretReferences).toEqual([{ id: expect.anything() }]);
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
      ]);
    });
  });

  describe('extractAndUpdateDownloadSourceSecrets', () => {
    it('should update existing secrets', async () => {
      const updatedDownloadSource = {
        ...downloadSource,
        secrets: {
          ssl: {
            key: 'newkey1',
          },
        },
      };
      const res = await extractAndUpdateDownloadSourceSecrets({
        oldDownloadSource: downloadSource,
        downloadSourceUpdate: updatedDownloadSource,
        esClient: esClientMock,
      });
      expect(res.downloadSourceUpdate).toEqual({
        ...downloadSource,
        secrets: {
          ssl: {
            key: {
              id: expect.any(String),
            },
          },
        },
      });
      expect(res.secretReferences).toEqual([{ id: expect.anything() }]);
      expect(res.secretsToDelete).toEqual([{ id: undefined }]);
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
      ]);
    });
  });

  describe('deleteDownloadSourceSecrets', () => {
    it('should delete existing secrets', async () => {
      const downloadSourceWithSecrets = {
        ...downloadSource,
        secrets: {
          ssl: {
            key: {
              id: '7jCKYZUBBY96FE7DX6L1',
            },
          },
        },
      } as any;

      await deleteDownloadSourceSecrets({
        downloadSource: downloadSourceWithSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
          },
        ],
      ]);
    });

    it('should do nothing if there are no existing secrets', async () => {
      const downloadSourceWithoutSecrets = {
        id: 'id1',
        name: 'Agent binary',
        host: 'https://binary-source-test',
        is_default: false,
        ssl: {
          certificate_authorities: ['cert authorities'],
          certificate: 'path/to/cert',
          key: 'key1',
        },
      } as any;

      await deleteDownloadSourceSecrets({
        downloadSource: downloadSourceWithoutSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([]);
    });
  });
});
