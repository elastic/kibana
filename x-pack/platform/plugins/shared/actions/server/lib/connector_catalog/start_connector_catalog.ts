/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionTypeRegistry } from '../../action_type_registry';
import { CATALOG_FIRST_LOAD_TIMEOUT_MS } from './constants';
import { loadCatalogConnectorTypes } from './load_catalog_connector_types';
import type { CatalogActionType, ConnectorCatalogStorage, StoredCatalogDefinition } from './types';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface ConnectorCatalogHandle {
  /** Resolves when the first load is done, failed, timed out, or skipped. Never rejects. */
  ready: Promise<void>;
  /** Aborts a running load and resolves ready without logs. */
  stop: () => void;
}

interface StartConnectorCatalogDeps {
  /** The catalog config. With false, nothing is read or written. */
  isEnabled: boolean;
  storage: Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Runs the first catalog load 1 time, in the background. It reads the catalog index and
 * registers its types. It never writes. With the config off, nothing is read.
 *
 * Timeline:
 *   start -> load ------------------------------> ready
 *   start -> deadline (timeoutMs) -> abort ------> ready (warn)
 *   start -> stop() -> abort ---------------------> ready (no logs)
 */
export const startConnectorCatalog = ({
  isEnabled,
  storage,
  actionTypeRegistry,
  buildType,
  logger,
  timeoutMs = CATALOG_FIRST_LOAD_TIMEOUT_MS,
}: StartConnectorCatalogDeps): ConnectorCatalogHandle => {
  if (!isEnabled) {
    logger.debug('The connector catalog is off. Nothing is read.');
    return { ready: Promise.resolve(), stop: () => {} };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const { signal } = controller;

  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  logger.debug(`Starting the first connector catalog load. Deadline: ${timeoutMs} ms.`);

  const firstLoad = async () => {
    const count = await loadCatalogConnectorTypes({
      storage,
      actionTypeRegistry,
      buildType,
      logger,
      signal,
    });
    // A result that arrives after an abort registers nothing and logs nothing.
    if (!signal.aborted) {
      logger.info(
        `Registered ${count} connector type(s) from the connector catalog in ${
          Date.now() - startedAt
        } ms.`
      );
    }
  };

  // Ends the wait at once on abort, even if a read hangs.
  const aborted = new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true });
  });

  const ready = Promise.race([firstLoad(), aborted])
    .catch((error: unknown) => {
      if (!signal.aborted) {
        logger.warn(`The first connector catalog load failed: ${getErrorMessage(error)}`);
      }
    })
    .finally(() => clearTimeout(deadline))
    .then(() => {
      if (timedOut) {
        logger.warn(
          `The first connector catalog load timed out after ${timeoutMs} ms. Only in-tree connector types are available.`
        );
      }
      logger.debug(`The connector catalog is ready after ${Date.now() - startedAt} ms.`);
    });

  return {
    ready,
    stop: () => {
      controller.abort();
    },
  };
};
