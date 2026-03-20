/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import {
  OSQUERY_INTEGRATION_NAME,
  FALLBACK_OSQUERY_VERSION,
  FALLBACK_ECS_VERSION,
} from '../../common/constants';
import type { SchemaType, OsqueryTable, EcsField } from '../../common/types/schema';

interface CacheEntry<T> {
  version: string;
  data: T[];
}

export class SchemaService {
  private osqueryCache: CacheEntry<OsqueryTable> | null = null;
  private ecsCache: CacheEntry<EcsField> | null = null;

  constructor(private readonly logger: Logger) {}

  async getSchema(
    schemaType: SchemaType,
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<{ version: string; data: OsqueryTable[] | EcsField[] }> {
    const pkgVersion = await this.getPackageVersion(packageService, savedObjectsClient);

    if (schemaType === 'osquery') {
      return this.getOsquerySchema(pkgVersion, packageService, savedObjectsClient);
    }

    return this.getEcsSchema(pkgVersion, packageService, savedObjectsClient);
  }

  private async getOsquerySchema(
    pkgVersion: string | undefined,
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<{ version: string; data: OsqueryTable[] }> {
    if (pkgVersion && this.osqueryCache?.version === pkgVersion) {
      return this.osqueryCache;
    }

    if (pkgVersion && packageService) {
      const data = await this.fetchAssetFromPackage<OsqueryTable>(
        pkgVersion,
        'schemas/osquery.json',
        packageService,
        savedObjectsClient
      );

      if (data) {
        this.osqueryCache = { version: pkgVersion, data };

        return this.osqueryCache;
      }
    }

    return this.getFallbackSchema('osquery');
  }

  private async getEcsSchema(
    pkgVersion: string | undefined,
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<{ version: string; data: EcsField[] }> {
    if (pkgVersion && this.ecsCache?.version === pkgVersion) {
      return this.ecsCache;
    }

    if (pkgVersion && packageService) {
      const data = await this.fetchAssetFromPackage<EcsField>(
        pkgVersion,
        'schemas/ecs.json',
        packageService,
        savedObjectsClient
      );

      if (data) {
        this.ecsCache = { version: pkgVersion, data };

        return this.ecsCache;
      }
    }

    return this.getFallbackSchema('ecs');
  }

  private async getPackageVersion(
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<string | undefined> {
    try {
      const installation = await packageService?.asInternalUser.getInstallation(
        OSQUERY_INTEGRATION_NAME,
        savedObjectsClient
      );

      return installation?.version;
    } catch (e) {
      this.logger.debug(`Failed to get osquery_manager installation: ${e.message}`);

      return undefined;
    }
  }

  private async fetchAssetFromPackage<T>(
    pkgVersion: string,
    assetRelativePath: string,
    packageService: PackageService,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<T[] | undefined> {
    const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/${assetRelativePath}`;

    try {
      const asset = await packageService.asInternalUser.getPackageAsset(
        assetPath,
        savedObjectsClient
      );

      const rawData = asset?.data_utf8;

      if (!rawData) {
        this.logger.debug(`Asset ${assetPath} has no UTF-8 data`);

        return undefined;
      }

      const parsed = JSON.parse(rawData);

      if (!Array.isArray(parsed)) {
        this.logger.warn(`Asset ${assetPath} did not contain an array`);

        return undefined;
      }

      return parsed as T[];
    } catch (error) {
      this.logger.warn(`Failed to fetch asset ${assetPath}: ${error.message}`);

      return undefined;
    }
  }

  private async getFallbackSchema(
    schemaType: 'osquery'
  ): Promise<{ version: string; data: OsqueryTable[] }>;
  private async getFallbackSchema(
    schemaType: 'ecs'
  ): Promise<{ version: string; data: EcsField[] }>;
  private async getFallbackSchema(
    schemaType: SchemaType
  ): Promise<{ version: string; data: OsqueryTable[] | EcsField[] }> {
    const version = schemaType === 'osquery' ? FALLBACK_OSQUERY_VERSION : FALLBACK_ECS_VERSION;
    const fileName = `v${version}.json`;
    const filePath = resolve(
      __dirname,
      '..',
      '..',
      'public',
      'common',
      'schemas',
      schemaType,
      fileName
    );

    try {
      const raw = await readFile(filePath, 'utf-8');

      return { version, data: JSON.parse(raw) };
    } catch (e) {
      this.logger.error(`Failed to read fallback schema at ${filePath}: ${e.message}`);

      return { version, data: [] };
    }
  }
}
