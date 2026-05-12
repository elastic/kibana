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
        includeSSLSecrets: true,
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
        includeSSLSecrets: true,
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

    it('should delete auth secrets', async () => {
      const downloadSourceWithAuthSecrets = {
        ...downloadSource,
        secrets: {
          auth: {
            password: {
              id: 'password-secret-id',
            },
          },
        },
      } as any;

      await deleteDownloadSourceSecrets({
        downloadSource: downloadSourceWithAuthSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toEqual([
        [
          {
            method: 'DELETE',
            path: '/_fleet/secret/password-secret-id',
          },
        ],
      ]);
    });

    it('should delete both SSL and auth secrets', async () => {
      const downloadSourceWithAllSecrets = {
        ...downloadSource,
        secrets: {
          ssl: {
            key: {
              id: 'ssl-key-secret-id',
            },
          },
          auth: {
            api_key: {
              id: 'api-key-secret-id',
            },
          },
        },
      } as any;

      await deleteDownloadSourceSecrets({
        downloadSource: downloadSourceWithAllSecrets,
        esClient: esClientMock,
      });
      expect(esClientMock.transport.request.mock.calls).toHaveLength(2);
      expect(esClientMock.transport.request.mock.calls).toContainEqual([
        {
          method: 'DELETE',
          path: '/_fleet/secret/ssl-key-secret-id',
        },
      ]);
      expect(esClientMock.transport.request.mock.calls).toContainEqual([
        {
          method: 'DELETE',
          path: '/_fleet/secret/api-key-secret-id',
        },
      ]);
    });
  });

  describe('auth secrets', () => {
    const downloadSourceWithAuth = {
      id: 'id1',
      name: 'Agent binary',
      host: 'https://binary-source-test',
      is_default: false,
      auth: {
        username: 'user1',
      },
      secrets: {
        auth: {
          password: 'secret-password',
        },
      },
    };

    describe('extractAndWriteDownloadSourcesSecrets with auth', () => {
      it('should create auth password secrets', async () => {
        const res = await extractAndWriteDownloadSourcesSecrets({
          downloadSource: downloadSourceWithAuth,
          esClient: esClientMock,
          includeAuthSecrets: true,
        });
        expect(res.downloadSource).toEqual({
          ...downloadSourceWithAuth,
          secrets: {
            auth: {
              password: {
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
                value: 'secret-password',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });

      it('should create auth api_key secrets', async () => {
        const downloadSourceWithApiKey = {
          ...downloadSourceWithAuth,
          secrets: {
            auth: {
              api_key: 'secret-api-key',
            },
          },
        };

        const res = await extractAndWriteDownloadSourcesSecrets({
          downloadSource: downloadSourceWithApiKey,
          esClient: esClientMock,
          includeAuthSecrets: true,
        });
        expect(res.downloadSource).toEqual({
          ...downloadSourceWithApiKey,
          secrets: {
            auth: {
              api_key: {
                id: expect.any(String),
              },
            },
          },
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'secret-api-key',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });
    });

    describe('extractAndUpdateDownloadSourceSecrets with auth', () => {
      it('should handle switching from password to api_key auth', async () => {
        const oldDownloadSource = {
          ...downloadSourceWithAuth,
          secrets: {
            auth: {
              password: { id: 'old-password-id' },
            },
          },
        };

        const downloadSourceUpdate = {
          secrets: {
            auth: {
              api_key: 'new-api-key',
            },
          },
        };

        const res = await extractAndUpdateDownloadSourceSecrets({
          oldDownloadSource: oldDownloadSource as any,
          downloadSourceUpdate,
          esClient: esClientMock,
          includeAuthSecrets: true,
        });

        expect(res.downloadSourceUpdate).toEqual({
          secrets: {
            auth: {
              api_key: {
                id: expect.any(String),
              },
            },
          },
        });
        // Old password should be marked for deletion
        expect(res.secretsToDelete).toEqual([{ id: 'old-password-id' }]);
        // New api_key should be created
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'new-api-key',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });

      it('should handle switching from api_key to password auth', async () => {
        const oldDownloadSource = {
          ...downloadSourceWithAuth,
          secrets: {
            auth: {
              api_key: { id: 'old-api-key-id' },
            },
          },
        };

        const downloadSourceUpdate = {
          secrets: {
            auth: {
              password: 'new-password',
            },
          },
        };

        const res = await extractAndUpdateDownloadSourceSecrets({
          oldDownloadSource: oldDownloadSource as any,
          downloadSourceUpdate,
          esClient: esClientMock,
          includeAuthSecrets: true,
        });

        expect(res.downloadSourceUpdate).toEqual({
          secrets: {
            auth: {
              password: {
                id: expect.any(String),
              },
            },
          },
        });
        // Old api_key should be marked for deletion
        expect(res.secretsToDelete).toEqual([{ id: 'old-api-key-id' }]);
      });
    });
  });
});
