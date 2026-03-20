/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import { ASSETS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { v5 as uuidv5 } from 'uuid';
import { SchemaService } from './schema_service';
import {
  OSQUERY_INTEGRATION_NAME,
  FALLBACK_OSQUERY_VERSION,
  FALLBACK_ECS_VERSION,
} from '../../common/constants';
import type { OsqueryTable, EcsField } from '../../common/types/schema';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import { readFile } from 'fs/promises';

// Same namespace as in the implementation
const ASSET_PATH_UUID_NAMESPACE = '71403015-cdd5-404b-a5da-6c43f35cad84';

function assetPathToObjectId(assetPath: string): string {
  return uuidv5(assetPath, ASSET_PATH_UUID_NAMESPACE);
}

const mockOsqueryTables: OsqueryTable[] = [
  {
    name: 'users',
    description: 'Local user accounts',
    platforms: ['linux', 'darwin', 'windows'],
    columns: [
      { name: 'uid', description: 'User ID', type: 'bigint' },
      { name: 'username', description: 'Username', type: 'text' },
    ],
  },
];

const mockEcsFields: EcsField[] = [
  {
    field: 'agent.id',
    type: 'keyword',
    normalization: 'array',
    example: '8a4f500d',
    description: 'Unique identifier of this agent',
  },
];

describe('SchemaService', () => {
  let logger: Logger;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let packageService: jest.Mocked<PackageService>;
  let schemaService: SchemaService;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = loggingSystemMock.createLogger();

    savedObjectsClient = {
      get: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkGet: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    packageService = {
      asInternalUser: {
        getInstallation: jest.fn(),
      },
    } as unknown as jest.Mocked<PackageService>;

    schemaService = new SchemaService(logger);
  });

  describe('getSchema', () => {
    describe('when schemaType is "osquery"', () => {
      it('should delegate to getOsquerySchema', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result).toEqual({ version: pkgVersion, data: mockOsqueryTables });
      });

      it('should delegate to getEcsSchema', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/ecs.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockEcsFields),
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result).toEqual({ version: pkgVersion, data: mockEcsFields });
      });
    });
  });

  describe('getOsquerySchema', () => {
    describe('cache hit', () => {
      it('should return cached data when package version has not changed', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        // First call populates the cache
        await schemaService.getSchema('osquery', packageService, savedObjectsClient);
        // Second call should use the cache
        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result).toEqual({ version: pkgVersion, data: mockOsqueryTables });
        // savedObjectsClient.get should only be called once — on the first fetch
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('cache miss / version change', () => {
      it('should fetch fresh data when package version changes', async () => {
        const firstVersion = '1.4.0';
        const secondVersion = '1.5.0';

        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValueOnce({
          version: firstVersion,
        });

        const firstAssetPath = `${OSQUERY_INTEGRATION_NAME}-${firstVersion}/schemas/osquery.json`;
        const firstObjectId = assetPathToObjectId(firstAssetPath);

        savedObjectsClient.get.mockResolvedValueOnce({
          id: firstObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: firstAssetPath,
            media_type: 'application/json',
          },
        });

        // First call with version 1.4.0
        await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        // Version bumps to 1.5.0
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValueOnce({
          version: secondVersion,
        });

        const updatedTables: OsqueryTable[] = [
          ...mockOsqueryTables,
          {
            name: 'processes',
            description: 'All running processes',
            platforms: ['linux', 'darwin', 'windows'],
            columns: [{ name: 'pid', description: 'Process ID', type: 'bigint' }],
          },
        ];

        const secondAssetPath = `${OSQUERY_INTEGRATION_NAME}-${secondVersion}/schemas/osquery.json`;
        const secondObjectId = assetPathToObjectId(secondAssetPath);

        savedObjectsClient.get.mockResolvedValueOnce({
          id: secondObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(updatedTables),
            data_base64: '',
            asset_path: secondAssetPath,
            media_type: 'application/json',
          },
        });

        // Second call with version 1.5.0 should bypass the cache
        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result).toEqual({ version: secondVersion, data: updatedTables });
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('Fleet asset fetch', () => {
      it('should return data from Fleet package assets on success', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(savedObjectsClient.get).toHaveBeenCalledWith(
          ASSETS_SAVED_OBJECT_TYPE,
          objectId
        );
        expect(result).toEqual({ version: pkgVersion, data: mockOsqueryTables });
      });

      it('should construct the correct asset object ID from the package version and path', async () => {
        const pkgVersion = '2.0.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const expectedAssetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
        const expectedObjectId = assetPathToObjectId(expectedAssetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: expectedObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: expectedAssetPath,
            media_type: 'application/json',
          },
        });

        await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(savedObjectsClient.get).toHaveBeenCalledWith(
          ASSETS_SAVED_OBJECT_TYPE,
          expectedObjectId
        );
      });
    });

    describe('Fleet asset not found (fallback)', () => {
      it('should fall back to local JSON file when Fleet asset is missing', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        savedObjectsClient.get.mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(
            ASSETS_SAVED_OBJECT_TYPE,
            'some-object-id'
          )
        );

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockOsqueryTables));

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toEqual(mockOsqueryTables);
        expect(readFile).toHaveBeenCalledWith(
          expect.stringContaining(`v${FALLBACK_OSQUERY_VERSION}.json`),
          'utf-8'
        );
      });

      it('should fall back to local JSON file when Fleet asset has no UTF-8 data', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: '',
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockOsqueryTables));

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toEqual(mockOsqueryTables);
      });
    });

    describe('package not installed (fallback)', () => {
      it('should fall back to local JSON file when getInstallation returns undefined', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockOsqueryTables));

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toEqual(mockOsqueryTables);
        expect(savedObjectsClient.get).not.toHaveBeenCalled();
      });

      it('should fall back to local JSON file when packageService is undefined', async () => {
        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockOsqueryTables));

        const result = await schemaService.getSchema('osquery', undefined, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toEqual(mockOsqueryTables);
        expect(savedObjectsClient.get).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should log a debug message and fall back when getInstallation throws', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockRejectedValue(
          new Error('Fleet is unavailable')
        );

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockOsqueryTables));

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get osquery_manager installation')
        );
      });

      it('should log a warning and fall back when savedObjectsClient.get throws a non-404 error', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        savedObjectsClient.get.mockRejectedValue(new Error('Elasticsearch connection refused'));

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockOsqueryTables));

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to fetch asset')
        );
      });

      it('should return empty data array when fallback file read fails', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file or directory'));

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining(`Failed to read fallback schema`)
        );
      });
    });
  });

  describe('getEcsSchema', () => {
    describe('cache hit', () => {
      it('should return cached data when package version has not changed', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/ecs.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockEcsFields),
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        // First call populates the cache
        await schemaService.getSchema('ecs', packageService, savedObjectsClient);
        // Second call should hit the cache
        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result).toEqual({ version: pkgVersion, data: mockEcsFields });
        expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('Fleet asset fetch', () => {
      it('should return data from Fleet package assets on success', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/ecs.json`;
        const objectId = assetPathToObjectId(assetPath);

        savedObjectsClient.get.mockResolvedValue({
          id: objectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockEcsFields),
            data_base64: '',
            asset_path: assetPath,
            media_type: 'application/json',
          },
        });

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(savedObjectsClient.get).toHaveBeenCalledWith(ASSETS_SAVED_OBJECT_TYPE, objectId);
        expect(result).toEqual({ version: pkgVersion, data: mockEcsFields });
      });
    });

    describe('Fleet asset not found (fallback)', () => {
      it('should fall back to local JSON file when Fleet ECS asset is missing', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        savedObjectsClient.get.mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(
            ASSETS_SAVED_OBJECT_TYPE,
            'some-object-id'
          )
        );

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockEcsFields));

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_ECS_VERSION);
        expect(result.data).toEqual(mockEcsFields);
        expect(readFile).toHaveBeenCalledWith(
          expect.stringContaining(`v${FALLBACK_ECS_VERSION}.json`),
          'utf-8'
        );
      });
    });

    describe('package not installed (fallback)', () => {
      it('should fall back to local JSON file when getInstallation returns undefined', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

        (readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockEcsFields));

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_ECS_VERSION);
        expect(result.data).toEqual(mockEcsFields);
        expect(savedObjectsClient.get).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return empty data array when ECS fallback file read fails', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

        (readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file or directory'));

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_ECS_VERSION);
        expect(result.data).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to read fallback schema')
        );
      });
    });
  });

  describe('independent cache per schema type', () => {
    it('should maintain separate caches for osquery and ecs schema types', async () => {
      const pkgVersion = '1.5.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      const osqueryAssetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
      const ecsAssetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/ecs.json`;
      const osqueryObjectId = assetPathToObjectId(osqueryAssetPath);
      const ecsObjectId = assetPathToObjectId(ecsAssetPath);

      savedObjectsClient.get
        .mockResolvedValueOnce({
          id: osqueryObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: osqueryAssetPath,
            media_type: 'application/json',
          },
        })
        .mockResolvedValueOnce({
          id: ecsObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockEcsFields),
            data_base64: '',
            asset_path: ecsAssetPath,
            media_type: 'application/json',
          },
        });

      const osqueryResult = await schemaService.getSchema(
        'osquery',
        packageService,
        savedObjectsClient
      );
      const ecsResult = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

      expect(osqueryResult).toEqual({ version: pkgVersion, data: mockOsqueryTables });
      expect(ecsResult).toEqual({ version: pkgVersion, data: mockEcsFields });

      // Both schemas were fetched separately
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.get).toHaveBeenNthCalledWith(
        1,
        ASSETS_SAVED_OBJECT_TYPE,
        osqueryObjectId
      );
      expect(savedObjectsClient.get).toHaveBeenNthCalledWith(
        2,
        ASSETS_SAVED_OBJECT_TYPE,
        ecsObjectId
      );
    });

    it('should serve osquery cache hit without affecting ecs schema fetch', async () => {
      const pkgVersion = '1.5.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      const osqueryAssetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`;
      const ecsAssetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/ecs.json`;
      const osqueryObjectId = assetPathToObjectId(osqueryAssetPath);
      const ecsObjectId = assetPathToObjectId(ecsAssetPath);

      savedObjectsClient.get
        .mockResolvedValueOnce({
          id: osqueryObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockOsqueryTables),
            data_base64: '',
            asset_path: osqueryAssetPath,
            media_type: 'application/json',
          },
        })
        .mockResolvedValueOnce({
          id: ecsObjectId,
          type: ASSETS_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            data_utf8: JSON.stringify(mockEcsFields),
            data_base64: '',
            asset_path: ecsAssetPath,
            media_type: 'application/json',
          },
        });

      // Populate both caches
      await schemaService.getSchema('osquery', packageService, savedObjectsClient);
      await schemaService.getSchema('ecs', packageService, savedObjectsClient);

      // Second call for osquery should hit the cache (no new get calls)
      const osqueryCacheResult = await schemaService.getSchema(
        'osquery',
        packageService,
        savedObjectsClient
      );

      expect(osqueryCacheResult).toEqual({ version: pkgVersion, data: mockOsqueryTables });
      // Still only 2 total calls (both from the initial population)
      expect(savedObjectsClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
