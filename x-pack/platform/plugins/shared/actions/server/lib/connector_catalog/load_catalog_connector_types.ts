/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionTypeRegistry } from '../../action_type_registry';
import { ensureSufficientLicense } from '../ensure_sufficient_license';
import type {
  CatalogActionType,
  CatalogDefinitionRef,
  ConnectorCatalogStorage,
  StoredCatalogDefinition,
} from './types';

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

  const refs = rows.flatMap((row: unknown) => {
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
  if (refs.length < rows.length) {
    logger.debug(
      `Ignored ${rows.length - refs.length} invalid row(s) of the connector catalog manifest.`
    );
  }
  return refs;
};

/** Builds and attempts to register every stored catalog definition. Returns the registered count. */
export const loadCatalogConnectorTypes = async ({
  storage,
  actionTypeRegistry,
  buildType,
  logger,
  signal,
}: {
  storage: Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  signal: AbortSignal;
}): Promise<number> => {
  if (signal.aborted) {
    logger.debug('The connector catalog load was aborted before it read anything.');
    return 0;
  }

  const manifest = await storage.getManifest({ signal });
  if (!manifest) {
    logger.debug(
      'No connector catalog manifest found (the index or the manifest document is missing). No catalog types to register.'
    );
    return 0;
  }

  const rows = parseManifestRows(manifest.raw, logger);
  if (rows.length === 0) {
    logger.debug('The connector catalog manifest lists no valid connectors. Nothing to register.');
    return 0;
  }
  logger.debug(
    () =>
      `The connector catalog manifest lists ${rows.length} connector(s): ${rows
        .map(({ id, version }) => `${id}@${version}`)
        .join(', ')}`
  );

  const definitions = await storage.getDefinitions(rows, { signal });
  logger.debug(`Read ${definitions.length} of ${rows.length} stored catalog definition(s).`);
  rows
    .filter(
      ({ id, version }) =>
        !definitions.some(
          ({ connectorId, version: storedVersion }) =>
            connectorId === id && storedVersion === version
        )
    )
    .forEach(({ id, version }) => {
      logger.warn(
        `The connector catalog manifest lists "${id}@${version}" but no definition is stored for it.`
      );
    });

  let registered = 0;
  for (const definition of definitions) {
    // A result that arrives after the timeout must not register anything.
    if (signal.aborted) {
      logger.debug(
        `The connector catalog load was aborted after registering ${registered} type(s).`
      );
      return registered;
    }
    const { connectorId, version, catalogVersion } = definition;
    try {
      logger.debug(
        `Building a connector type from catalog definition "${connectorId}@${version}" (catalog ${catalogVersion}).`
      );
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
      logger.debug(
        `Registered connector type "${actionType.id}" from "${connectorId}@${version}". Task type "actions:${actionType.id}" is now available.`
      );
    } catch (error) {
      logger.warn(
        `Skipping catalog connector "${connectorId}" version ${version}: ${getErrorMessage(error)}`
      );
    }
  }
  return registered;
};
