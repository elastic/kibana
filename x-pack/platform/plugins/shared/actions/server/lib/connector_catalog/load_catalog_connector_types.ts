/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionTypeRegistry } from '../../action_type_registry';
import type { ActionType } from '../../types';
import { ensureSufficientLicense } from '../ensure_sufficient_license';
import type {
  CatalogDefinitionRef,
  ConnectorCatalogStorage,
  StoredCatalogDefinition,
} from './types';

const VERSION_PATTERN = /^\d+(\.\d+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Compares dot separated numeric versions segment by segment. Missing segments count as 0. */
const compareVersions = (a: string, b: string): number => {
  const aSegments = a.split('.').map(Number);
  const bSegments = b.split('.').map(Number);
  const length = Math.max(aSegments.length, bSegments.length);
  for (let index = 0; index < length; index++) {
    const difference = (aSegments[index] ?? 0) - (bSegments[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

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

const pickHighestVersions = (definitions: StoredCatalogDefinition[]): StoredCatalogDefinition[] => {
  const highest = new Map<string, StoredCatalogDefinition>();
  for (const definition of definitions) {
    const current = highest.get(definition.connectorId);
    if (!current || compareVersions(definition.version, current.version) > 0) {
      highest.set(definition.connectorId, definition);
    }
  }
  return [...highest.values()];
};

/** Registers 1 type per catalog id, built from the highest stored version. Returns the count. */
export const loadCatalogConnectorTypes = async ({
  storage,
  actionTypeRegistry,
  buildType,
  logger,
  signal,
}: {
  storage: Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => ActionType;
  logger: Logger;
  signal: AbortSignal;
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
  for (const definition of pickHighestVersions(definitions)) {
    // A result that arrives after the timeout must not register anything.
    if (signal.aborted) {
      return registered;
    }
    const { connectorId, version } = definition;
    try {
      const actionType = buildType(definition);
      if (actionTypeRegistry.has(actionType.id)) {
        logger.warn(
          `Skipping catalog connector "${connectorId}" version ${version}: type "${actionType.id}" is already registered.`
        );
        continue;
      }
      ensureSufficientLicense(actionType);
      actionTypeRegistry.register(actionType);
      registered++;
    } catch (error) {
      logger.warn(
        `Skipping catalog connector "${connectorId}" version ${version}: ${getErrorMessage(error)}`
      );
    }
  }
  return registered;
};
