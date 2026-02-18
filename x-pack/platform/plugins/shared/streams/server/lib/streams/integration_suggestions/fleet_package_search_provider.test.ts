/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { FleetPackageSearchProvider } from './fleet_package_search_provider';

describe('FleetPackageSearchProvider', () => {
  let logger: MockedLogger;
  let packageClientMock: jest.Mocked<PackageClient>;
  let provider: FleetPackageSearchProvider;

  const createPackageListItem = (
    overrides: Partial<PackageListItem> = {}
  ): PackageListItem =>
    ({
      id: 'test-package',
      name: 'test-package',
      title: 'Test Package',
      version: '1.0.0',
      type: 'integration',
      status: 'installed',
      description: 'A test package',
      icons: [],
      categories: ['monitoring'],
      ...overrides,
    } as PackageListItem);

  beforeEach(() => {
    logger = loggerMock.create();
    packageClientMock = {
      getPackages: jest.fn(),
    } as unknown as jest.Mocked<PackageClient>;

    provider = new FleetPackageSearchProvider({
      packageClient: packageClientMock,
      logger,
    });
  });

  describe('searchPackages', () => {
    it('returns all packages when no search term provided', async () => {
      const packages = [
        createPackageListItem({ name: 'mysql', title: 'MySQL' }),
        createPackageListItem({ name: 'nginx', title: 'Nginx' }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages();

      expect(packageClientMock.getPackages).toHaveBeenCalledWith({ prerelease: true });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'mysql',
        title: 'MySQL',
        version: '1.0.0',
      });
      expect(result[1]).toMatchObject({
        name: 'nginx',
        title: 'Nginx',
      });
    });

    it('filters packages by name when search term provided', async () => {
      const packages = [
        createPackageListItem({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
        createPackageListItem({ name: 'nginx_otel', title: 'Nginx (OTel)' }),
        createPackageListItem({ name: 'postgresql', title: 'PostgreSQL' }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages('mysql');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('mysql_otel');
    });

    it('filters packages by title (case-insensitive)', async () => {
      const packages = [
        createPackageListItem({ name: 'mysql_otel', title: 'MySQL (OTel)' }),
        createPackageListItem({ name: 'my-sql-package', title: 'My SQL Package' }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages('SQL');

      expect(result).toHaveLength(2);
    });

    it('filters packages by description', async () => {
      const packages = [
        createPackageListItem({
          name: 'custom-db',
          title: 'Custom DB',
          description: 'A package for MySQL monitoring',
        }),
        createPackageListItem({
          name: 'other-package',
          title: 'Other',
          description: 'Something else',
        }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages('mysql');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('custom-db');
    });

    it('filters packages by category', async () => {
      const packages = [
        createPackageListItem({
          name: 'db-package',
          title: 'DB Package',
          categories: ['database'],
        }),
        createPackageListItem({
          name: 'web-package',
          title: 'Web Package',
          categories: ['web'],
        }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages('database');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('db-package');
    });

    it('uses package name as title when title is not provided', async () => {
      const packages = [
        createPackageListItem({
          name: 'my-package',
          title: undefined,
        }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages();

      expect(result[0].title).toBe('my-package');
    });

    it('handles undefined categories', async () => {
      const packages = [
        createPackageListItem({
          name: 'package-no-categories',
          categories: undefined,
        }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages();

      expect(result[0].categories).toBeUndefined();
    });

    it('filters out undefined values from categories', async () => {
      const packages = [
        createPackageListItem({
          name: 'package-with-mixed-categories',
          categories: ['monitoring', undefined, 'database'] as any,
        }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages();

      expect(result[0].categories).toEqual(['monitoring', 'database']);
    });

    it('throws error when packageClient fails', async () => {
      const error = new Error('Fleet unavailable');
      packageClientMock.getPackages.mockRejectedValue(error);

      await expect(provider.searchPackages()).rejects.toThrow('Fleet unavailable');
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns empty array when no packages match search term', async () => {
      const packages = [
        createPackageListItem({ name: 'mysql', title: 'MySQL' }),
        createPackageListItem({ name: 'nginx', title: 'Nginx' }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages('nonexistent');

      expect(result).toHaveLength(0);
    });

    it('trims and normalizes search term', async () => {
      const packages = [
        createPackageListItem({ name: 'mysql', title: 'MySQL' }),
      ];
      packageClientMock.getPackages.mockResolvedValue(packages);

      const result = await provider.searchPackages('  MYSQL  ');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('mysql');
    });
  });
});
