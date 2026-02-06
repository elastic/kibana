/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import type { DownloadSourceSOAttributes } from '../types';
import { DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE } from '../constants';

import { downloadSourceService } from './download_source';
import { appContextService } from './app_context';
import { agentPolicyService } from './agent_policy';
import {
  isSSLSecretStorageEnabled,
  isDownloadSourceAuthSecretStorageEnabled,
  extractAndWriteDownloadSourcesSecrets,
  extractAndUpdateDownloadSourceSecrets,
  deleteDownloadSourceSecrets,
  deleteSecrets,
} from './secrets';

jest.mock('./app_context');
jest.mock('./agent_policy');
jest.mock('./secrets');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

const mockedIsSSLSecretStorageEnabled = isSSLSecretStorageEnabled as jest.MockedFunction<
  typeof isSSLSecretStorageEnabled
>;
const mockedIsDownloadSourceAuthSecretStorageEnabled =
  isDownloadSourceAuthSecretStorageEnabled as jest.MockedFunction<
    typeof isDownloadSourceAuthSecretStorageEnabled
  >;
const mockedExtractAndWriteDownloadSourcesSecrets =
  extractAndWriteDownloadSourcesSecrets as jest.MockedFunction<
    typeof extractAndWriteDownloadSourcesSecrets
  >;
const mockedExtractAndUpdateDownloadSourceSecrets =
  extractAndUpdateDownloadSourceSecrets as jest.MockedFunction<
    typeof extractAndUpdateDownloadSourceSecrets
  >;
const mockedDeleteDownloadSourceSecrets = deleteDownloadSourceSecrets as jest.MockedFunction<
  typeof deleteDownloadSourceSecrets
>;
const mockedDeleteSecrets = deleteSecrets as jest.MockedFunction<typeof deleteSecrets>;

function mockDownloadSourceSO(id: string, attributes: any = {}) {
  return {
    id,
    type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
    references: [],
    attributes: {
      source_id: id,
      ...attributes,
    },
  };
}

function getMockedSoClient(options: { defaultDownloadSourceId?: string; sameName?: boolean } = {}) {
  const soClientMock = savedObjectsClientMock.create();

  soClientMock.get.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case 'download-source-test': {
        return mockDownloadSourceSO('download-source-test', {
          is_default: false,
          name: 'Test',
          host: 'http://test.co',
        });
      }
      case 'existing-default-download-source': {
        return mockDownloadSourceSO('existing-default-download-source', {
          is_default: true,
          name: 'Default host',
          host: 'http://artifacts.co',
        });
      }
      default:
        throw new Error('not found: ' + id);
    }
  });
  soClientMock.update.mockImplementation(async (type, id, data) => {
    return {
      id,
      type,
      attributes: {},
      references: [],
    };
  });
  soClientMock.create.mockImplementation(async (type, data, createOptions) => {
    return {
      id: createOptions?.id || 'generated-id',
      type,
      attributes: {},
      references: [],
    };
  });
  soClientMock.find.mockImplementation(async (findOptions) => {
    if (
      options?.defaultDownloadSourceId &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('is_default') &&
      findOptions.search === 'true'
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClientMock.get(
              DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
              options.defaultDownloadSourceId
            )),
          },
        ],
        total: 1,
      };
    }

    if (
      options.sameName &&
      findOptions.searchFields &&
      findOptions.searchFields.includes('name') &&
      findOptions
    ) {
      return {
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            score: 0,
            ...(await soClientMock.get(DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE, 'download-source-test')),
          },
        ],
        total: 1,
      };
    }

    return {
      page: 1,
      per_page: 10,
      saved_objects: [],
      total: 0,
    };
  });

  mockedAppContextService.getInternalUserSOClient.mockReturnValue(soClientMock);

  return soClientMock;
}

function getMockedEncryptedSoClient() {
  const esoClientMock: jest.Mocked<EncryptedSavedObjectsClient> = {
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  };

  esoClientMock.getDecryptedAsInternalUser.mockImplementation(async (type: string, id: string) => {
    switch (id) {
      case 'download-source-test': {
        return mockDownloadSourceSO('download-source-test', {
          is_default: false,
          name: 'Test',
          host: 'http://test.co',
        });
      }
      case 'existing-default-download-source': {
        return mockDownloadSourceSO('existing-default-download-source', {
          is_default: true,
          name: 'Default host',
          host: 'http://artifacts.co',
        });
      }
      case 'generated-id': {
        return mockDownloadSourceSO('generated-id', {
          is_default: true,
          name: 'New default host',
          host: 'http://test.co',
        });
      }
      default:
        throw new Error('not found: ' + id);
    }
  });

  mockedAppContextService.getEncryptedSavedObjects.mockReturnValue(esoClientMock);

  return esoClientMock;
}

let mockedLogger: jest.Mocked<Logger>;
describe('Download Service', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    jest
      .mocked(appContextService.getExperimentalFeatures)
      .mockReturnValue({ useSpaceAwareness: true } as any);
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
      canEncrypt: true,
    } as any);

    // Default mock implementations for secrets functions
    mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
    mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);
    mockedExtractAndWriteDownloadSourcesSecrets.mockImplementation(async ({ downloadSource }) => ({
      downloadSource,
      secretReferences: [],
    }));
    mockedExtractAndUpdateDownloadSourceSecrets.mockImplementation(
      async ({ downloadSourceUpdate }) => ({
        downloadSourceUpdate,
        secretReferences: [],
        secretsToDelete: [],
      })
    );
    mockedDeleteDownloadSourceSecrets.mockResolvedValue();
    mockedDeleteSecrets.mockResolvedValue();
  });

  afterEach(() => {
    mockedAgentPolicyService.list.mockClear();
    mockedAgentPolicyService.hasAPMIntegration.mockClear();
    mockedAgentPolicyService.removeDefaultSourceFromAll.mockReset();
    mockedAppContextService.getInternalUserSOClient.mockReset();
    mockedAppContextService.getEncryptedSavedObjectsSetup.mockReset();
    mockedIsSSLSecretStorageEnabled.mockReset();
    mockedIsDownloadSourceAuthSecretStorageEnabled.mockReset();
    mockedExtractAndWriteDownloadSourcesSecrets.mockReset();
    mockedExtractAndUpdateDownloadSourceSecrets.mockReset();
    mockedDeleteDownloadSourceSecrets.mockReset();
    mockedDeleteSecrets.mockReset();
  });

  const esClient = elasticsearchServiceMock.createInternalClient();
  const esoClientMock = getMockedEncryptedSoClient();

  describe('create', () => {
    it('works with a predefined id', async () => {
      const soClientMock = getMockedSoClient();

      await downloadSourceService.create(
        soClientMock,
        esClient,
        {
          host: 'http://test.co',
          is_default: false,
          name: 'Test',
        },
        { id: 'download-source-test' }
      );

      expect(soClientMock.create).toBeCalled();
      expect(esoClientMock.getDecryptedAsInternalUser).toBeCalledWith(
        DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
        'download-source-test'
      );

      // ID should always be the same for a predefined id
      expect(soClientMock.create.mock.calls[0][2]?.id).toEqual('download-source-test');
      expect(
        (soClientMock.create.mock.calls[0][1] as DownloadSourceSOAttributes).source_id
      ).toEqual('download-source-test');
    });

    it('should create a new default value if none exists before', async () => {
      const soClientMock = getMockedSoClient();

      await downloadSourceService.create(
        soClientMock,
        esClient,
        {
          is_default: true,
          name: 'Test',
          host: 'http://test.co',
        },
        { id: 'download-source-test' }
      );

      expect(soClientMock.update).not.toBeCalled();
    });

    it('should update existing default download source when creating a new default one', async () => {
      const soClientMock = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });

      await downloadSourceService.create(soClientMock, esClient, {
        is_default: true,
        name: 'New default host',
        host: 'http://test.co',
      });

      expect(soClientMock.update).toBeCalledTimes(1);
      expect(soClientMock.update).toBeCalledWith(
        expect.anything(),
        'existing-default-download-source',
        { is_default: false }
      );
    });

    it('should throw if encryptedSavedObject is not configured', async () => {
      const soClientMock = getMockedSoClient();
      mockedAppContextService.getEncryptedSavedObjectsSetup.mockReturnValue({
        canEncrypt: false,
      } as any);
      await expect(
        downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: true,
            name: 'Test',
            host: 'http://test.co',
          },
          { id: 'download-source-test' }
        )
      ).rejects.toThrow(`Agent binary source needs encrypted saved object api key to be set`);
    });

    it('should work if encryptedSavedObject is configured', async () => {
      const soClientMock = getMockedSoClient();

      await downloadSourceService.create(
        soClientMock,
        esClient,
        {
          is_default: true,
          name: 'Test',
          host: 'http://test.co',
        },
        { id: 'download-source-test' }
      );
      expect(soClientMock.create).toBeCalled();
    });

    describe('secret storage', () => {
      it('should store SSL secrets when SSL secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndWriteDownloadSourcesSecrets.mockResolvedValue({
          downloadSource: {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { ssl: { key: { id: 'secret-id' } } },
          },
          secretReferences: [{ id: 'secret-id' }],
        });

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { ssl: { key: 'my-ssl-key' } },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: true,
            includeAuthSecrets: false,
          })
        );
        expect(soClientMock.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            secrets: { ssl: { key: { id: 'secret-id' } } },
          }),
          expect.anything()
        );
      });

      it('should store auth secrets when auth secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndWriteDownloadSourcesSecrets.mockResolvedValue({
          downloadSource: {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { auth: { password: { id: 'auth-secret-id' } } },
          },
          secretReferences: [{ id: 'auth-secret-id' }],
        });

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { auth: { password: 'my-password' } },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: false,
            includeAuthSecrets: true,
          })
        );
        expect(soClientMock.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            secrets: { auth: { password: { id: 'auth-secret-id' } } },
          }),
          expect.anything()
        );
      });

      it('should store both SSL and auth secrets when both are enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndWriteDownloadSourcesSecrets.mockResolvedValue({
          downloadSource: {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: {
              ssl: { key: { id: 'ssl-secret-id' } },
              auth: { password: { id: 'auth-secret-id' } },
            },
          },
          secretReferences: [{ id: 'ssl-secret-id' }, { id: 'auth-secret-id' }],
        });

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: {
              ssl: { key: 'my-ssl-key' },
              auth: { password: 'my-password' },
            },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: true,
            includeAuthSecrets: true,
          })
        );
      });

      it('should store SSL key as plain text when SSL secret storage is disabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { ssl: { key: 'my-ssl-key' } },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).not.toBeCalled();
        expect(soClientMock.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            ssl: JSON.stringify({ key: 'my-ssl-key' }),
          }),
          expect.anything()
        );
      });

      it('should store auth as plain text when auth secret storage is disabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { auth: { password: 'my-password' } },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).not.toBeCalled();
        expect(soClientMock.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            auth: JSON.stringify({ password: 'my-password' }),
          }),
          expect.anything()
        );
      });

      it('should store SSL as secret but auth as plain text when only SSL secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);
        mockedExtractAndWriteDownloadSourcesSecrets.mockResolvedValue({
          downloadSource: {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { ssl: { key: { id: 'ssl-secret-id' } } },
          },
          secretReferences: [{ id: 'ssl-secret-id' }],
        });

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: {
              ssl: { key: 'my-ssl-key' },
              auth: { password: 'my-password' },
            },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: true,
            includeAuthSecrets: false,
          })
        );
        // Auth should be stored as plain text
        expect(soClientMock.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            auth: JSON.stringify({ password: 'my-password' }),
          }),
          expect.anything()
        );
      });

      it('should store auth as secret but SSL as plain text when only auth secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndWriteDownloadSourcesSecrets.mockResolvedValue({
          downloadSource: {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: { auth: { password: { id: 'auth-secret-id' } } },
          },
          secretReferences: [{ id: 'auth-secret-id' }],
        });

        await downloadSourceService.create(
          soClientMock,
          esClient,
          {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            secrets: {
              ssl: { key: 'my-ssl-key' },
              auth: { password: 'my-password' },
            },
          },
          { id: 'download-source-test' }
        );

        expect(mockedExtractAndWriteDownloadSourcesSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: false,
            includeAuthSecrets: true,
          })
        );
        // SSL should be stored as plain text
        expect(soClientMock.create).toBeCalledWith(
          expect.anything(),
          expect.objectContaining({
            ssl: JSON.stringify({ key: 'my-ssl-key' }),
          }),
          expect.anything()
        );
      });
    });
  });

  describe('update', () => {
    it('should update existing default value when updating a download source to become the default one', async () => {
      const soClientMock = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });

      await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
        is_default: true,
        name: 'New default',
        host: 'http://test.co',
      });

      expect(soClientMock.update).toBeCalledWith(
        expect.anything(),
        'existing-default-download-source',
        {
          is_default: false,
        }
      );
      expect(soClientMock.update).toBeCalledWith(expect.anything(), 'download-source-test', {
        is_default: true,
        name: 'New default',
        host: 'http://test.co',
      });
    });

    it('should not update existing default when the download source is already the default one', async () => {
      const soClientMock = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });

      await downloadSourceService.update(
        soClientMock,
        esClient,
        'existing-default-download-source',
        {
          is_default: true,
          name: 'Test',
          host: 'http://test.co',
        }
      );

      expect(soClientMock.update).toBeCalledTimes(1);
      expect(soClientMock.update).toBeCalledWith(
        expect.anything(),
        'existing-default-download-source',
        {
          is_default: true,
          name: 'Test',
          host: 'http://test.co',
        }
      );
    });

    describe('secret storage', () => {
      it('should update SSL secrets when SSL secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            name: 'Updated Test',
            host: 'http://test.co',
            secrets: { ssl: { key: { id: 'new-secret-id' } } },
          },
          secretReferences: [{ id: 'new-secret-id' }],
          secretsToDelete: [],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Test',
          host: 'http://test.co',
          secrets: { ssl: { key: 'new-ssl-key' } },
        });

        expect(mockedExtractAndUpdateDownloadSourceSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: true,
            includeAuthSecrets: false,
          })
        );
      });

      it('should update auth secrets when auth secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            name: 'Updated Test',
            host: 'http://test.co',
            secrets: { auth: { password: { id: 'new-auth-secret-id' } } },
          },
          secretReferences: [{ id: 'new-auth-secret-id' }],
          secretsToDelete: [],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Test',
          host: 'http://test.co',
          secrets: { auth: { password: 'new-password' } },
        });

        expect(mockedExtractAndUpdateDownloadSourceSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: false,
            includeAuthSecrets: true,
          })
        );
      });

      it('should update both SSL and auth secrets when both are enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);
        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            name: 'Updated Test',
            host: 'http://test.co',
            secrets: {
              ssl: { key: { id: 'new-ssl-secret-id' } },
              auth: { password: { id: 'new-auth-secret-id' } },
            },
          },
          secretReferences: [{ id: 'new-ssl-secret-id' }, { id: 'new-auth-secret-id' }],
          secretsToDelete: [],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Test',
          host: 'http://test.co',
          secrets: {
            ssl: { key: 'new-ssl-key' },
            auth: { password: 'new-password' },
          },
        });

        expect(mockedExtractAndUpdateDownloadSourceSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: true,
            includeAuthSecrets: true,
          })
        );
      });

      it('should store SSL key as plain text when SSL secret storage is disabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Test',
          host: 'http://test.co',
          secrets: { ssl: { key: 'new-ssl-key' } },
        });

        expect(mockedExtractAndUpdateDownloadSourceSecrets).not.toBeCalled();
        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            ssl: JSON.stringify({ key: 'new-ssl-key' }),
          })
        );
      });

      it('should store auth as plain text when auth secret storage is disabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Test',
          host: 'http://test.co',
          secrets: { auth: { password: 'new-password' } },
        });

        expect(mockedExtractAndUpdateDownloadSourceSecrets).not.toBeCalled();
        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            auth: JSON.stringify({ password: 'new-password' }),
          })
        );
      });

      it('should store SSL as secret but auth as plain text when only SSL secret storage is enabled', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);
        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            name: 'Updated Test',
            host: 'http://test.co',
            secrets: { ssl: { key: { id: 'new-ssl-secret-id' } } },
          },
          secretReferences: [{ id: 'new-ssl-secret-id' }],
          secretsToDelete: [],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Test',
          host: 'http://test.co',
          secrets: {
            ssl: { key: 'new-ssl-key' },
            auth: { password: 'new-password' },
          },
        });

        expect(mockedExtractAndUpdateDownloadSourceSecrets).toBeCalledWith(
          expect.objectContaining({
            includeSSLSecrets: true,
            includeAuthSecrets: false,
          })
        );
        // Auth should be stored as plain text
        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            auth: JSON.stringify({ password: 'new-password' }),
          })
        );
      });
    });

    describe('auth type switching', () => {
      it('should remove password secret reference when switching to API key auth', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);

        // Mock the original item to have password auth
        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            auth: JSON.stringify({ username: 'user1' }),
            secrets: { auth: { password: { id: 'old-password-secret-id' } } },
          })
        );

        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            secrets: { auth: { api_key: { id: 'new-api-key-secret-id' } } },
          },
          secretReferences: [{ id: 'new-api-key-secret-id' }],
          secretsToDelete: [{ id: 'old-password-secret-id' }],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          secrets: { auth: { api_key: 'new-api-key' } },
        });

        // Verify the update was called with secrets containing only api_key (not password)
        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            secrets: expect.objectContaining({
              auth: expect.objectContaining({
                api_key: { id: 'new-api-key-secret-id' },
              }),
            }),
          })
        );
      });

      it('should clear username when API key is set', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);

        // Mock the original item to have username/password auth
        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            auth: JSON.stringify({ username: 'user1', password: 'pass1' }),
          })
        );

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          auth: { api_key: 'new-api-key' },
        });

        // Verify username is NOT in the stored auth
        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            auth: JSON.stringify({ api_key: 'new-api-key' }),
          })
        );
      });

      it('should clear username when secret API key is set', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);

        // Mock the original item to have username/password auth
        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            auth: JSON.stringify({ username: 'user1' }),
            secrets: { auth: { password: { id: 'old-password-secret-id' } } },
          })
        );

        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            secrets: { auth: { api_key: { id: 'new-api-key-secret-id' } } },
          },
          secretReferences: [{ id: 'new-api-key-secret-id' }],
          secretsToDelete: [{ id: 'old-password-secret-id' }],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          secrets: { auth: { api_key: 'new-api-key' } },
        });

        // Verify username is cleared (auth should be null or empty)
        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            auth: null,
          })
        );
      });

      it('should preserve SSL secrets when updating only name/host (not SSL fields)', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(true);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(false);

        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            ssl: JSON.stringify({ certificate: 'cert' }),
            secrets: { ssl: { key: { id: 'existing-ssl-secret-id' } } },
          })
        );

        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            name: 'Updated Name',
          },
          secretReferences: [],
          secretsToDelete: [{ id: 'existing-ssl-secret-id' }],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Name',
        });

        expect(mockedDeleteSecrets).not.toBeCalled();

        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            secrets: expect.objectContaining({
              ssl: { key: { id: 'existing-ssl-secret-id' } },
            }),
          })
        );
      });

      it('should preserve auth secrets when updating only name/host (not auth fields)', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);

        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            auth: JSON.stringify({ username: 'user1' }),
            secrets: { auth: { password: { id: 'existing-auth-secret-id' } } },
          })
        );

        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            name: 'Updated Name',
          },
          secretReferences: [],
          secretsToDelete: [{ id: 'existing-auth-secret-id' }],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          name: 'Updated Name',
        });

        expect(mockedDeleteSecrets).not.toBeCalled();

        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            secrets: expect.objectContaining({
              auth: { password: { id: 'existing-auth-secret-id' } },
            }),
          })
        );
      });

      it('should delete auth secrets when explicitly setting auth to null', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);

        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            auth: JSON.stringify({ username: 'user1' }),
            secrets: { auth: { password: { id: 'existing-auth-secret-id' } } },
          })
        );

        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {},
          secretReferences: [],
          secretsToDelete: [{ id: 'existing-auth-secret-id' }],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          auth: null,
        } as Parameters<typeof downloadSourceService.update>[3]);

        expect(mockedDeleteSecrets).toBeCalledWith(
          expect.objectContaining({
            ids: ['existing-auth-secret-id'],
          })
        );
      });

      it('should replace auth entirely when updating with headers only', async () => {
        const soClientMock = getMockedSoClient();
        mockedIsSSLSecretStorageEnabled.mockResolvedValue(false);
        mockedIsDownloadSourceAuthSecretStorageEnabled.mockResolvedValue(true);

        const esoClientMockLocal = getMockedEncryptedSoClient();
        esoClientMockLocal.getDecryptedAsInternalUser.mockResolvedValue(
          mockDownloadSourceSO('download-source-test', {
            is_default: false,
            name: 'Test',
            host: 'http://test.co',
            auth: JSON.stringify({ username: 'user1' }),
            secrets: { auth: { password: { id: 'existing-auth-secret-id' } } },
          })
        );

        mockedExtractAndUpdateDownloadSourceSecrets.mockResolvedValue({
          downloadSourceUpdate: {
            auth: { headers: [{ key: 'X-Custom', value: 'test' }] },
          },
          secretReferences: [],
          secretsToDelete: [{ id: 'existing-auth-secret-id' }],
        });

        await downloadSourceService.update(soClientMock, esClient, 'download-source-test', {
          auth: { headers: [{ key: 'X-Custom', value: 'test' }] },
        });

        expect(mockedDeleteSecrets).toBeCalledWith(
          expect.objectContaining({
            ids: ['existing-auth-secret-id'],
          })
        );

        expect(soClientMock.update).toBeCalledWith(
          expect.anything(),
          'download-source-test',
          expect.objectContaining({
            auth: JSON.stringify({ headers: [{ key: 'X-Custom', value: 'test' }] }),
          })
        );
      });
    });
  });

  describe('delete', () => {
    it('Call removeDefaultSourceFromAll before deleting the value', async () => {
      const soClientMock = getMockedSoClient();
      await downloadSourceService.delete('download-source-test');
      expect(mockedAgentPolicyService.removeDefaultSourceFromAll).toBeCalled();
      expect(soClientMock.delete).toBeCalled();
    });

    it('should delete secrets when deleting a download source', async () => {
      const soClientMock = getMockedSoClient();
      await downloadSourceService.delete('download-source-test');
      expect(mockedDeleteDownloadSourceSecrets).toBeCalledWith(
        expect.objectContaining({
          downloadSource: expect.objectContaining({
            id: 'download-source-test',
          }),
        })
      );
      expect(soClientMock.delete).toBeCalled();
    });
  });

  describe('get', () => {
    it('works with a predefined id', async () => {
      const downloadSource = await downloadSourceService.get('download-source-test');

      expect(esoClientMock.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
        'download-source-test'
      );

      expect(downloadSource.id).toEqual('download-source-test');
    });
  });

  describe('getDefaultDownloadSourceId', () => {
    it('works with a predefined id', async () => {
      const soClientMock = getMockedSoClient({
        defaultDownloadSourceId: 'existing-default-download-source',
      });
      const defaultId = await downloadSourceService.getDefaultDownloadSourceId();

      expect(soClientMock.find).toBeCalled();
      expect(defaultId).toEqual('existing-default-download-source');
    });
  });

  describe('requireUniqueName', () => {
    it('throws an error if the name already exists', async () => {
      const soClientMock = getMockedSoClient({
        defaultDownloadSourceId: 'download-source-test',
        sameName: true,
      });
      await expect(
        async () => await downloadSourceService.requireUniqueName({ name: 'Test' })
      ).rejects.toThrow(`Download Source 'download-source-test' already exists with name 'Test'`);
      expect(soClientMock.find).toBeCalled();
    });

    it('does not throw if the name is unique', () => {
      const soClientMock = getMockedSoClient({
        defaultDownloadSourceId: 'download-source-test',
      });
      expect(
        async () => await downloadSourceService.requireUniqueName({ name: 'Test' })
      ).not.toThrow();
      expect(soClientMock.find).toBeCalled();
    });
  });
});
