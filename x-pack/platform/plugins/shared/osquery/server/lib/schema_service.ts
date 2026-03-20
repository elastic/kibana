/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { v5 as uuidv5 } from 'uuid';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ASSETS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
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

interface PackageAssetAttributes {
  data_utf8: string;
  data_base64: string;
  asset_path: string;
  media_type: string;
}

// Same namespace UUID used by Fleet's assetPathToObjectId
const ASSET_PATH_UUID_NAMESPACE = '71403015-cdd5-404b-a5da-6c43f35cad84';

function assetPathToObjectId(assetPath: string): string {
  return uuidv5(assetPath, ASSET_PATH_UUID_NAMESPACE);
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
    if (schemaType === 'osquery') {
      return this.getOsquerySchema(packageService, savedObjectsClient);
    }

    return this.getEcsSchema(packageService, savedObjectsClient);
  }

  private async getOsquerySchema(
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<{ version: string; data: OsqueryTable[] }> {
    const installation = await this.getInstallation(packageService, savedObjectsClient);
    const pkgVersion = installation?.version;

    if (pkgVersion && this.osqueryCache?.version === pkgVersion) {
      return this.osqueryCache;
    }

    if (pkgVersion) {
      const data = await this.fetchAssetFromPackage<OsqueryTable>(
        pkgVersion,
        'schemas/osquery.json',
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
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<{ version: string; data: EcsField[] }> {
    const installation = await this.getInstallation(packageService, savedObjectsClient);
    const pkgVersion = installation?.version;

    if (pkgVersion && this.ecsCache?.version === pkgVersion) {
      return this.ecsCache;
    }

    if (pkgVersion) {
      const data = await this.fetchAssetFromPackage<EcsField>(
        pkgVersion,
        'schemas/ecs.json',
        savedObjectsClient
      );

      if (data) {
        this.ecsCache = { version: pkgVersion, data };

        return this.ecsCache;
      }
    }

    return this.getFallbackSchema('ecs');
  }

  private async getInstallation(
    packageService: PackageService | undefined,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    try {
      return await packageService?.asInternalUser.getInstallation(
        OSQUERY_INTEGRATION_NAME,
        savedObjectsClient
      );
    } catch (e) {
      this.logger.debug(`Failed to get osquery_manager installation: ${e.message}`);

      return undefined;
    }
  }

  private async fetchAssetFromPackage<T>(
    pkgVersion: string,
    assetRelativePath: string,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<T[] | undefined> {
    const assetPath = `${OSQUERY_INTEGRATION_NAME}-${pkgVersion}/${assetRelativePath}`;
    const objectId = assetPathToObjectId(assetPath);

    try {
      const assetSO = await savedObjectsClient.get<PackageAssetAttributes>(
        ASSETS_SAVED_OBJECT_TYPE,
        objectId
      );

      const rawData = assetSO.attributes.data_utf8;

      if (!rawData) {
        this.logger.debug(`Asset ${assetPath} has no UTF-8 data`);

        return undefined;
      }

      return JSON.parse(rawData) as T[];
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        this.logger.debug(`Asset ${assetPath} not found in Fleet package assets`);

        return undefined;
      }
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
    const version =
      schemaType === 'osquery' ? FALLBACK_OSQUERY_VERSION : FALLBACK_ECS_VERSION;
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
