/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionTypeRegistry } from '../../action_type_registry';
import { ensureSufficientLicense } from '../ensure_sufficient_license';
import { parseSpecVersion } from '../resolve_connector_spec_version';
import type {
  CatalogActionType,
  CatalogDefinitionRef,
  ConnectorCatalogStorage,
  StoredCatalogDefinition,
} from './types';
import type { VersionedConnectorType } from './versioned_connector_type';
import { createVersionedConnectorType } from './versioned_connector_type';

const VERSION_PATTERN = /^\d+(\.\d+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const parseManifestRows = (raw: string, logger: Logger): CatalogDefinitionRef[] => {
  let manifest: unknown;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    logger.warn(`Connector catalog manifest is not valid JSON: ${getErrorMessage(error)}`);
    return [];
  }

  const rows = isRecord(manifest) ? manifest.connectors : undefined;
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row: unknown) => {
    if (!isRecord(row)) {
      return [];
    }
    const { id, version } = row;
    if (typeof id !== 'string' || id === '') {
      return [];
    }
    if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
      return [];
    }
    return [{ id, version }];
  });
};

/**
 * Stored versions have 3 parts ("1.1.0"). Connector pins have 2 ("1.1"). The patch part is
 * dropped. Returns undefined for a version that cannot be a pin, for example major 0.
 */
const toSpecVersionKey = (version: string): string | undefined => {
  const parts = version.split('.');
  if (parts.length < 2 || parts.length > 3) {
    return undefined;
  }
  const key = parts.slice(0, 2).join('.');
  return parseSpecVersion(key)?.minor === undefined ? undefined : key;
};

/**
 * Builds every stored catalog definition and registers one versioned type per id.
 * Returns the number of types registered by this call.
 */
export const loadCatalogConnectorTypes = async ({
  storage,
  actionTypeRegistry,
  buildType,
  logger,
  signal,
  versionedTypes = new Map<string, VersionedConnectorType>(),
}: {
  storage: Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  signal: AbortSignal;
  /** Handles of versioned types from earlier loads. Keep the same map between loads to add versions to existing entries. */
  versionedTypes?: Map<string, VersionedConnectorType>;
}): Promise<number> => {
  if (signal.aborted) {
    return 0;
  }

  const manifest = await storage.getManifest({ signal });
  if (!manifest) {
    return 0;
  }

  const rows = parseManifestRows(manifest.raw, logger);
  if (rows.length === 0) {
    return 0;
  }

  const definitions = await storage.getDefinitions(rows, { signal });

  let registered = 0;
  // Versions that failed before their id had an entry. They are marked once the entry exists.
  const failedVersions = new Map<string, Set<string>>();
  for (const definition of definitions) {
    // A result that arrives after the timeout must not register anything.
    if (signal.aborted) {
      return registered;
    }
    const { connectorId, version } = definition;
    const versionKey = toSpecVersionKey(version);
    if (versionKey === undefined) {
      logger.warn(
        `Skipping catalog connector "${connectorId}" version ${version}: the version is not a valid spec version.`
      );
      continue;
    }
    try {
      const actionType = buildType(definition);
      const versionedType = versionedTypes.get(actionType.id);
      if (!versionedType && actionTypeRegistry.has(actionType.id)) {
        logger.warn(
          `Skipping catalog connector "${connectorId}" version ${version}: type "${actionType.id}" is already registered.`
        );
        continue;
      }
      ensureSufficientLicense(actionType);
      const built = { version: versionKey, type: actionType };

      if (versionedType) {
        if (versionedType.hasVersion(versionKey)) {
          logger.warn(
            `Skipping catalog connector "${connectorId}" version ${version}: version ${versionKey} is already loaded.`
          );
          continue;
        }
        versionedType.addVersion(built);
        continue;
      }

      const created = createVersionedConnectorType({ id: actionType.id, versions: [built] });
      actionTypeRegistry.register(created.actionType);
      versionedTypes.set(actionType.id, created);
      failedVersions.get(actionType.id)?.forEach((failed) => created.markUnbuildable(failed));
      registered++;
    } catch (error) {
      logger.warn(
        `Skipping catalog connector "${connectorId}" version ${version}: ${getErrorMessage(error)}`
      );
      const versionedType = versionedTypes.get(connectorId);
      if (versionedType) {
        versionedType.markUnbuildable(versionKey);
      } else {
        failedVersions.set(
          connectorId,
          (failedVersions.get(connectorId) ?? new Set()).add(versionKey)
        );
      }
    }
  }
  return registered;
};
