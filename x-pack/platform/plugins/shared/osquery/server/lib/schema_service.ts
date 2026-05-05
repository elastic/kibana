/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import {
  OSQUERY_INTEGRATION_NAME,
  FALLBACK_OSQUERY_VERSION,
  FALLBACK_ECS_VERSION,
  OSQUERY_PACKAGE_INSTALLATION_CACHE_TTL_MS,
} from '../../common/constants';
import type {
  SchemaType,
  SchemaResponse,
  OsqueryTable,
  EcsField,
  SchemaMetadata,
} from '../../common/types/schema';
// Static paths required — must match FALLBACK_*_VERSION in common/constants.ts
import fallbackOsquerySchemaJson from '../../common/schemas/osquery/v5.19.0.json';
import fallbackEcsSchemaJson from '../../common/schemas/ecs/v9.2.0.json';

interface PackageInfo {
  pkgVersion: string;
  metadata: SchemaMetadata | undefined;
}

interface CacheEntry<T> {
  pkgVersion: string;
  version: string;
  data: T[];
}

export class SchemaService {
  private osqueryCache: CacheEntry<OsqueryTable> | null = null;
  private ecsCache: CacheEntry<EcsField> | null = null;
  private packageInfoCache: {
    info: PackageInfo | undefined;
    expiresAt: number;
  } | null = null;

  constructor(private readonly logger: Logger) {}

  async getSchema(
    schemaType: SchemaType,
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<SchemaResponse> {
    const packageInfo = await this.getPackageInfo(packageService, savedObjectsClient);

    if (schemaType === 'osquery') {
      return this.getOsquerySchema(packageInfo, packageService, savedObjectsClient);
    }

    return this.getEcsSchema(packageInfo, packageService, savedObjectsClient);
  }

  private async getOsquerySchema(
    packageInfo: PackageInfo | undefined,
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<SchemaResponse> {
    const pkgVersion = packageInfo?.pkgVersion;

    if (pkgVersion && this.osqueryCache?.pkgVersion === pkgVersion) {
      return {
        version: this.osqueryCache.version,
        pkgVersion,
        data: this.osqueryCache.data,
      };
    }

    if (pkgVersion && packageService) {
      const data = await this.fetchAssetFromPackage<OsqueryTable>(
        pkgVersion,
        'schemas/osquery.json',
        packageService,
        savedObjectsClient
      );

      if (data) {
        const version = packageInfo?.metadata?.osquery_version ?? pkgVersion;
        this.osqueryCache = { pkgVersion, version, data };

        return { version, pkgVersion, data };
      }
    }

    return this.getFallbackSchema('osquery');
  }

  private async getEcsSchema(
    packageInfo: PackageInfo | undefined,
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<SchemaResponse> {
    const pkgVersion = packageInfo?.pkgVersion;

    if (pkgVersion && this.ecsCache?.pkgVersion === pkgVersion) {
      return {
        version: this.ecsCache.version,
        pkgVersion,
        data: this.ecsCache.data,
      };
    }

    if (pkgVersion && packageService) {
      const data = await this.fetchAssetFromPackage<EcsField>(
        pkgVersion,
        'schemas/ecs.json',
        packageService,
        savedObjectsClient
      );

      if (data) {
        const version = packageInfo?.metadata?.ecs_version ?? pkgVersion;
        this.ecsCache = { pkgVersion, version, data };

        return { version, pkgVersion, data };
      }
    }

    return this.getFallbackSchema('ecs');
  }

  private async getPackageInfo(
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<PackageInfo | undefined> {
    if (!packageService) {
      return undefined;
    }

    const now = Date.now();

    if (this.packageInfoCache !== null && now < this.packageInfoCache.expiresAt) {
      return this.packageInfoCache.info;
    }

    try {
      const installation = await packageService.asInternalUser.getInstallation(
        OSQUERY_INTEGRATION_NAME,
        savedObjectsClient
      );

      const pkgVersion = installation?.version;

      if (!pkgVersion) {
        this.packageInfoCache = {
          info: undefined,
          expiresAt: now + OSQUERY_PACKAGE_INSTALLATION_CACHE_TTL_MS,
        };

        return undefined;
      }

      const metadata = await this.fetchSchemaMetadata(
        pkgVersion,
        packageService,
        savedObjectsClient
      );

      const info: PackageInfo = { pkgVersion, metadata };
      this.packageInfoCache = {
        info,
        expiresAt: now + OSQUERY_PACKAGE_INSTALLATION_CACHE_TTL_MS,
      };

      return info;
    } catch (e) {
      this.logger.debug(`Failed to get osquery_manager installation: ${e.message}`);

      this.packageInfoCache = {
        info: undefined,
        expiresAt: now + OSQUERY_PACKAGE_INSTALLATION_CACHE_TTL_MS,
      };

      return undefined;
    }
  }

  private async fetchSchemaMetadata(
    pkgVersion: string,
    packageService: PackageService,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<SchemaMetadata | undefined> {
    const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/schemas/metadata.json`;

    try {
      const asset = await packageService.asInternalUser.getPackageAsset(
        assetPath,
        savedObjectsClient
      );

      const rawData = asset?.data_utf8;

      if (!rawData) {
        this.logger.debug(`Metadata asset ${assetPath} not found — using package version`);

        return undefined;
      }

      return JSON.parse(rawData) as SchemaMetadata;
    } catch (error) {
      this.logger.debug(
        `Failed to fetch metadata from ${assetPath}: ${error.message} — using package version`
      );

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

  private getFallbackSchema(schemaType: SchemaType): SchemaResponse {
    const version = schemaType === 'osquery' ? FALLBACK_OSQUERY_VERSION : FALLBACK_ECS_VERSION;
    const data =
      schemaType === 'osquery'
        ? (fallbackOsquerySchemaJson as OsqueryTable[])
        : (fallbackEcsSchemaJson as EcsField[]);

    return { version, data };
  }
}
