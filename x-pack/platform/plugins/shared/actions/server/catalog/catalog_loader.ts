/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { getContentHash, toIconDataUrl, validateSvgIcon } from './icon';
import type { CatalogLogOnce } from './log_once';
import { parseCatalogManifest } from './parse_manifest';
import { verifyCatalogSignature } from './signature';
import { buildVersion } from './build_version';
import { compareSpecVersions, parseSpecVersion } from './spec_version_format';
import type { PinnedVersionsClient } from './pinned_versions';
import { findPinnedSpecVersions } from './pinned_versions';
import type { CatalogActionType, CatalogTypeMetadata, TypeMetadataState } from './types';
import type { VersionedConnectorType } from './versioned_connector_type';

export interface CatalogRegistryDeps {
  registerType: (actionType: CatalogActionType) => void;
  isTypeRegistered: (actionTypeId: string) => boolean;
  updateFeatureUsageTier?: (actionType: CatalogActionType) => void;
}

export type VersionedTypeFactory = (options: {
  id: string;
  versions: ReturnType<typeof buildVersion>[];
  metadata: TypeMetadataState;
}) => VersionedConnectorType;

export interface LoadCatalogFromIndexDeps {
  storage: ConnectorCatalogStorage;
  publicKeys: readonly string[];
  registry: CatalogRegistryDeps;
  pinnedClient: PinnedVersionsClient;
  buildType: VersionedTypeFactory;
  types: Map<string, VersionedConnectorType>;
  logger: Logger;
  logOnce: CatalogLogOnce;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toTypeMetadataState = (
  id: string,
  metadata: CatalogTypeMetadata,
  iconDataUrl?: string
): TypeMetadataState => ({
  displayName: metadata.displayName,
  description: metadata.description,
  docsUrl: metadata.docsUrl,
  minimumLicense: metadata.minimumLicense,
  isTechnicalPreview: metadata.isTechnicalPreview,
  supportedFeatureIds: metadata.supportedFeatureIds,
  iconDataUrl,
});

const acceptedLatestPerMajor = (versions: string[]): Map<number, string[]> => {
  const byMajor = new Map<number, string[]>();
  for (const version of versions) {
    const { major } = parseSpecVersion(version);
    const list = byMajor.get(major) ?? [];
    list.push(version);
    byMajor.set(major, list);
  }
  for (const list of byMajor.values()) {
    list.sort((left, right) => compareSpecVersions(right, left));
  }
  return byMajor;
};

/** Loads catalog types from the signed index manifest (doc 7.5). */
export const loadCatalogFromIndex = async ({
  storage,
  publicKeys,
  registry,
  pinnedClient,
  buildType,
  types,
  logger,
  logOnce,
}: LoadCatalogFromIndexDeps): Promise<{ registered: number }> => {
  const stored = await storage.getManifest();
  if (!stored) {
    return { registered: 0 };
  }
  if (!verifyCatalogSignature(stored.bytes, stored.signature, publicKeys)) {
    logOnce.error(
      stored.catalogVersion,
      'signature',
      'Stored connector catalog signature verification failed; serving no catalog types'
    );
    return { registered: 0 };
  }

  let manifest;
  try {
    manifest = parseCatalogManifest(JSON.parse(stored.bytes), logger);
  } catch (error) {
    logOnce.error(
      stored.catalogVersion,
      'parse',
      `Stored connector catalog manifest is invalid: ${errorMessage(error)}`
    );
    return { registered: 0 };
  }

  const listed = await storage.listDefinitions();
  const listedById = new Map<string, Array<{ version: string; contentHash: string }>>();
  for (const row of listed) {
    const rows = listedById.get(row.id) ?? [];
    rows.push({ version: row.version, contentHash: row.contentHash });
    listedById.set(row.id, rows);
  }

  const pinned = await findPinnedSpecVersions(pinnedClient, logger);
  const iconHashes = [
    ...new Set(
      Object.values(manifest.typeMetadata)
        .map((metadata) => metadata.icon?.contentHash)
        .filter((hash): hash is string => hash !== undefined)
    ),
  ];
  const assets = await storage.getAssets(iconHashes);

  const ids = new Set([...listedById.keys(), ...pinned.keys()]);
  let registered = 0;

  for (const id of ids) {
    const typeMetadata = manifest.typeMetadata[id];
    if (!typeMetadata) {
      logOnce.warn(
        manifest.catalogVersion,
        `metadata:${id}`,
        `Skipping connector "${id}": type metadata is missing from the signed manifest`
      );
      continue;
    }

    if (registry.isTypeRegistered(id) && !types.has(id)) {
      logOnce.warn(
        manifest.catalogVersion,
        `collision:${id}`,
        `Skipping catalog connector "${id}" because an in-tree type is already registered`
      );
      continue;
    }

    const storedVersions = (listedById.get(id) ?? []).map((row) => row.version);
    const byMajor = acceptedLatestPerMajor(storedVersions);
    const majors = [...byMajor.keys()].sort((left, right) => right - left);
    if (majors.length === 0 && !pinned.get(id)?.size) {
      continue;
    }

    const iconHash = typeMetadata.icon?.contentHash;
    const storedIcon = iconHash ? assets.get(iconHash) : undefined;
    let iconDataUrl: string | undefined;
    if (storedIcon) {
      try {
        if (getContentHash(storedIcon.svg) !== storedIcon.contentHash) {
          throw new Error('hash mismatch');
        }
        validateSvgIcon(storedIcon.svg);
        iconDataUrl = toIconDataUrl(storedIcon.svg);
      } catch (error) {
        logOnce.warn(
          manifest.catalogVersion,
          `icon:${id}`,
          `Skipping icon for "${id}": ${errorMessage(error)}`
        );
      }
    }
    const metadata = toTypeMetadataState(id, typeMetadata, iconDataUrl);

    const tryBuild = async (version: string) => {
      try {
        const definition = await storage.getDefinition(id, version);
        if (!definition) {
          return undefined;
        }
        return buildVersion(definition.yaml);
      } catch (error) {
        logOnce.warn(
          manifest.catalogVersion,
          `build:${id}@${version}`,
          `Failed to build connector "${id}@${version}": ${errorMessage(error)}`
        );
        return undefined;
      }
    };

    const needed = new Set<string>();
    for (const major of majors) {
      const candidates = byMajor.get(major) ?? [];
      for (const version of candidates) {
        const built = await tryBuild(version);
        if (built) {
          needed.add(version);
          break;
        }
      }
    }
    for (const version of pinned.get(id) ?? []) {
      needed.add(version);
    }

    const existing = types.get(id);
    if (existing) {
      for (const version of needed) {
        if (existing.hasVersion(version)) {
          continue;
        }
        const built = await tryBuild(version);
        if (built) {
          existing.addVersion(built);
        }
      }
      const previousLicense = existing.getMetadata().minimumLicense;
      existing.updateMetadata(metadata);
      if (previousLicense !== metadata.minimumLicense) {
        registry.updateFeatureUsageTier?.(existing.actionType);
      }
      continue;
    }

    const initialVersion =
      majors.length === 0
        ? undefined
        : await (async () => {
            for (const version of byMajor.get(majors[0]) ?? []) {
              const built = await tryBuild(version);
              if (built) {
                return built;
              }
            }
            return undefined;
          })();

    if (!initialVersion) {
      continue;
    }

    const type = buildType({
      id,
      versions: [initialVersion],
      metadata,
    });
    for (const version of needed) {
      if (type.hasVersion(version)) {
        continue;
      }
      const built = await tryBuild(version);
      if (built) {
        type.addVersion(built);
      }
    }

    if (registry.isTypeRegistered(id)) {
      logOnce.warn(
        manifest.catalogVersion,
        `collision:${id}`,
        `Skipping catalog connector "${id}" because an in-tree type is already registered`
      );
      continue;
    }
    registry.registerType(type.actionType);
    types.set(id, type);
    registered += 1;
  }

  return { registered };
};
