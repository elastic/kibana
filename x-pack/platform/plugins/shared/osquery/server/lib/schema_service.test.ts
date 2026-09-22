/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import { SchemaService } from './schema_service';
import {
  OSQUERY_INTEGRATION_NAME,
  FALLBACK_OSQUERY_VERSION,
  FALLBACK_ECS_VERSION,
} from '../../common/constants';
import type { OsqueryTable, EcsField } from '../../common/types/schema';

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

const mockMetadata = {
  osquery_version: '5.21.0',
  ecs_version: '9.3.0',
};

function createMockAsset(data: unknown) {
  return {
    package_name: OSQUERY_INTEGRATION_NAME,
    package_version: '1.5.0',
    install_source: 'registry',
    asset_path: '',
    media_type: 'application/json',
    data_utf8: JSON.stringify(data),
    data_base64: '',
  };
}

/**
 * Sets up getPackageAsset to return schema data and optionally metadata.
 * Routes calls based on the asset path.
 */
function mockPackageAssets(
  packageService: jest.Mocked<PackageService>,
  options: {
    osquery?: unknown;
    ecs?: unknown;
    metadata?: unknown;
  }
) {
  (packageService.asInternalUser.getPackageAsset as jest.Mock).mockImplementation(
    (assetPath: string) => {
      if (assetPath.endsWith('/schemas/osquery.json') && options.osquery !== undefined) {
        return Promise.resolve(createMockAsset(options.osquery));
      }

      if (assetPath.endsWith('/schemas/ecs.json') && options.ecs !== undefined) {
        return Promise.resolve(createMockAsset(options.ecs));
      }

      if (assetPath.endsWith('/schemas/metadata.json') && options.metadata !== undefined) {
        return Promise.resolve(createMockAsset(options.metadata));
      }

      return Promise.resolve(undefined);
    }
  );
}

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
        getPackageAsset: jest.fn(),
      },
    } as unknown as jest.Mocked<PackageService>;

    schemaService = new SchemaService(logger);
  });

  describe('getSchema', () => {
    it('should return osquery schema with metadata version and pkgVersion', async () => {
      const pkgVersion = '1.25.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      mockPackageAssets(packageService, {
        osquery: mockOsqueryTables,
        metadata: mockMetadata,
      });

      const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

      expect(result).toEqual({
        version: mockMetadata.osquery_version,
        pkgVersion,
        data: mockOsqueryTables,
      });
    });

    it('should return ecs schema with metadata version and pkgVersion', async () => {
      const pkgVersion = '1.25.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      mockPackageAssets(packageService, {
        ecs: mockEcsFields,
        metadata: mockMetadata,
      });

      const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

      expect(result).toEqual({
        version: mockMetadata.ecs_version,
        pkgVersion,
        data: mockEcsFields,
      });
    });

    it('should fall back to package version when metadata is not available', async () => {
      const pkgVersion = '1.4.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      mockPackageAssets(packageService, {
        osquery: mockOsqueryTables,
        // no metadata — simulates older package version without metadata.json
      });

      const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

      expect(result).toEqual({
        version: pkgVersion,
        pkgVersion,
        data: mockOsqueryTables,
      });
    });

    it('should not include pkgVersion in fallback response', async () => {
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

      const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

      expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
      expect(result.pkgVersion).toBeUndefined();
    });
  });

  describe('getOsquerySchema', () => {
    describe('cache hit', () => {
      it('should return cached data when package version has not changed', async () => {
        const pkgVersion = '1.25.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          osquery: mockOsqueryTables,
          metadata: mockMetadata,
        });

        // First call populates the cache
        await schemaService.getSchema('osquery', packageService, savedObjectsClient);
        // Second call should use the cache
        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result).toEqual({
          version: mockMetadata.osquery_version,
          pkgVersion,
          data: mockOsqueryTables,
        });
        // metadata.json fetched during getPackageInfo, osquery.json fetched in getOsquerySchema
        // Second call uses cache for both
        expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledTimes(2);
        expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      });

      it('should call getInstallation once when getSchema is invoked repeatedly within the installation cache TTL', async () => {
        const pkgVersion = '1.25.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          osquery: mockOsqueryTables,
          metadata: mockMetadata,
        });

        await schemaService.getSchema('osquery', packageService, savedObjectsClient);
        await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      });
    });

    describe('cache miss / version change', () => {
      it('should fetch fresh data when package version changes after installation cache TTL expires', async () => {
        const firstVersion = '1.24.0';
        const secondVersion = '1.25.0';
        const now = Date.now();
        const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValueOnce({
          version: firstVersion,
        });

        mockPackageAssets(packageService, {
          osquery: mockOsqueryTables,
          metadata: mockMetadata,
        });

        // First call with version 1.24.0
        await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        // Advance time past the installation TTL (60s)
        dateNowSpy.mockReturnValue(now + 61_000);

        // Version bumps to 1.25.0
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

        const updatedMetadata = { osquery_version: '5.22.0', ecs_version: '9.3.0' };

        mockPackageAssets(packageService, {
          osquery: updatedTables,
          metadata: updatedMetadata,
        });

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result).toEqual({
          version: updatedMetadata.osquery_version,
          pkgVersion: secondVersion,
          data: updatedTables,
        });
        expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(2);

        dateNowSpy.mockRestore();
      });
    });

    describe('Fleet asset fetch', () => {
      it('should construct the correct asset paths', async () => {
        const pkgVersion = '2.0.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          osquery: mockOsqueryTables,
          metadata: mockMetadata,
        });

        await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledWith(
          `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/metadata.json`,
          savedObjectsClient
        );
        expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledWith(
          `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/osquery.json`,
          savedObjectsClient
        );
      });
    });

    describe('Fleet asset not found (fallback)', () => {
      it('should fall back to bundled JSON when Fleet asset is missing', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          metadata: mockMetadata,
          // no osquery asset
        });

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toBeInstanceOf(Array);
      });

      it('should fall back to bundled JSON when Fleet asset has no UTF-8 data', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        (packageService.asInternalUser.getPackageAsset as jest.Mock).mockImplementation(
          (assetPath: string) => {
            if (assetPath.endsWith('/schemas/osquery.json')) {
              return Promise.resolve({
                ...createMockAsset(mockOsqueryTables),
                data_utf8: '',
              });
            }

            return Promise.resolve(undefined);
          }
        );

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
      });
    });

    describe('package not installed (fallback)', () => {
      it('should fall back to bundled JSON when getInstallation returns undefined', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toBeInstanceOf(Array);
        expect(packageService.asInternalUser.getPackageAsset).not.toHaveBeenCalled();
      });

      it('should fall back to bundled JSON when packageService is undefined', async () => {
        const result = await schemaService.getSchema('osquery', undefined, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(result.data).toBeInstanceOf(Array);
      });
    });

    describe('error handling', () => {
      it('should log a debug message and fall back when getInstallation throws', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockRejectedValue(
          new Error('Fleet is unavailable')
        );

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get osquery_manager installation')
        );
      });

      it('should log a warning and fall back when getPackageAsset throws', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        (packageService.asInternalUser.getPackageAsset as jest.Mock).mockRejectedValue(
          new Error('Elasticsearch connection refused')
        );

        const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_OSQUERY_VERSION);
      });
    });
  });

  describe('getEcsSchema', () => {
    describe('cache hit', () => {
      it('should return cached data when package version has not changed', async () => {
        const pkgVersion = '1.25.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          ecs: mockEcsFields,
          metadata: mockMetadata,
        });

        await schemaService.getSchema('ecs', packageService, savedObjectsClient);
        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result).toEqual({
          version: mockMetadata.ecs_version,
          pkgVersion,
          data: mockEcsFields,
        });
        // metadata + ecs on first call, cache hit on second
        expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledTimes(2);
        expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      });
    });

    describe('Fleet asset fetch', () => {
      it('should return data from Fleet package assets on success', async () => {
        const pkgVersion = '1.25.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          ecs: mockEcsFields,
          metadata: mockMetadata,
        });

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result).toEqual({
          version: mockMetadata.ecs_version,
          pkgVersion,
          data: mockEcsFields,
        });
      });
    });

    describe('Fleet asset not found (fallback)', () => {
      it('should fall back to bundled JSON when Fleet ECS asset is missing', async () => {
        const pkgVersion = '1.5.0';
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
          version: pkgVersion,
        });

        mockPackageAssets(packageService, {
          metadata: mockMetadata,
          // no ecs asset
        });

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_ECS_VERSION);
        expect(result.data).toBeInstanceOf(Array);
      });
    });

    describe('package not installed (fallback)', () => {
      it('should fall back to bundled JSON when getInstallation returns undefined', async () => {
        (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue(undefined);

        const result = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

        expect(result.version).toBe(FALLBACK_ECS_VERSION);
        expect(result.data).toBeInstanceOf(Array);
        expect(packageService.asInternalUser.getPackageAsset).not.toHaveBeenCalled();
      });
    });
  });

  describe('schema metadata', () => {
    it('should fetch metadata once during getPackageInfo and reuse for both schemas', async () => {
      const pkgVersion = '1.25.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      mockPackageAssets(packageService, {
        osquery: mockOsqueryTables,
        ecs: mockEcsFields,
        metadata: mockMetadata,
      });

      const osqueryResult = await schemaService.getSchema(
        'osquery',
        packageService,
        savedObjectsClient
      );
      const ecsResult = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

      expect(osqueryResult.version).toBe('5.21.0');
      expect(ecsResult.version).toBe('9.3.0');

      // metadata.json (once) + osquery.json + ecs.json = 3 calls total
      expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledTimes(3);
      // getInstallation only called once (cached within TTL)
      expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
    });

    it('should gracefully fall back to pkgVersion when metadata fetch fails', async () => {
      const pkgVersion = '1.5.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      (packageService.asInternalUser.getPackageAsset as jest.Mock).mockImplementation(
        (assetPath: string) => {
          if (assetPath.endsWith('/schemas/metadata.json')) {
            return Promise.reject(new Error('Not found'));
          }

          if (assetPath.endsWith('/schemas/osquery.json')) {
            return Promise.resolve(createMockAsset(mockOsqueryTables));
          }

          return Promise.resolve(undefined);
        }
      );

      const result = await schemaService.getSchema('osquery', packageService, savedObjectsClient);

      expect(result.version).toBe(pkgVersion);
      expect(result.pkgVersion).toBe(pkgVersion);
      expect(result.data).toEqual(mockOsqueryTables);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch metadata')
      );
    });
  });

  describe('independent cache per schema type', () => {
    it('should maintain separate caches for osquery and ecs schema types', async () => {
      const pkgVersion = '1.25.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      mockPackageAssets(packageService, {
        osquery: mockOsqueryTables,
        ecs: mockEcsFields,
        metadata: mockMetadata,
      });

      const osqueryResult = await schemaService.getSchema(
        'osquery',
        packageService,
        savedObjectsClient
      );
      const ecsResult = await schemaService.getSchema('ecs', packageService, savedObjectsClient);

      expect(osqueryResult).toEqual({
        version: mockMetadata.osquery_version,
        pkgVersion,
        data: mockOsqueryTables,
      });
      expect(ecsResult).toEqual({
        version: mockMetadata.ecs_version,
        pkgVersion,
        data: mockEcsFields,
      });

      // metadata.json + osquery.json + ecs.json = 3 calls
      expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledTimes(3);
      expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
    });

    it('should serve osquery cache hit without affecting ecs schema fetch', async () => {
      const pkgVersion = '1.25.0';
      (packageService.asInternalUser.getInstallation as jest.Mock).mockResolvedValue({
        version: pkgVersion,
      });

      mockPackageAssets(packageService, {
        osquery: mockOsqueryTables,
        ecs: mockEcsFields,
        metadata: mockMetadata,
      });

      // Populate both caches
      await schemaService.getSchema('osquery', packageService, savedObjectsClient);
      await schemaService.getSchema('ecs', packageService, savedObjectsClient);

      // Third call for osquery should hit the cache
      const osqueryCacheResult = await schemaService.getSchema(
        'osquery',
        packageService,
        savedObjectsClient
      );

      expect(osqueryCacheResult).toEqual({
        version: mockMetadata.osquery_version,
        pkgVersion,
        data: mockOsqueryTables,
      });
      // Still only 3 total calls from the initial population
      expect(packageService.asInternalUser.getPackageAsset).toHaveBeenCalledTimes(3);
      expect(packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
    });
  });
});
