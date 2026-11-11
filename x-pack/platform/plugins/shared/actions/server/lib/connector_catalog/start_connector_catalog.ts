/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG } from '../../../common';
import type { ActionTypeRegistry } from '../../action_type_registry';
import { CATALOG_FIRST_LOAD_TIMEOUT_MS } from './constants';
import { loadCatalogConnectorTypes } from './load_catalog_connector_types';
import type { CatalogActionType, ConnectorCatalogStorage, StoredCatalogDefinition } from './types';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface ConnectorCatalogHandle {
  /** Resolves when the first load is done, failed, timed out, or skipped by the flag. Never rejects. */
  ready: Promise<void>;
  /** Stops following the flag. */
  stop: () => void;
}

interface StartConnectorCatalogDeps {
  featureFlags: Pick<CoreStart['featureFlags'], 'getBooleanValue$'>;
  storage: Pick<ConnectorCatalogStorage, 'ensureIndex' | 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Creates the index, then registers the catalog types. Never rejects.
 * Stops at the timeout and aborts the pending requests, so a late result registers nothing.
 */
const runLoad = async ({
  storage,
  actionTypeRegistry,
  buildType,
  logger,
  timeoutMs = CATALOG_FIRST_LOAD_TIMEOUT_MS,
}: StartConnectorCatalogDeps): Promise<void> => {
  const controller = new AbortController();
  const { signal } = controller;

  const load = async (): Promise<'done'> => {
    await storage.ensureIndex({ signal });
    const count = await loadCatalogConnectorTypes({
      storage,
      actionTypeRegistry,
      buildType,
      logger,
      signal,
    });
    if (!signal.aborted) {
      logger.info(`Registered ${count} connector type(s) from the connector catalog.`);
    }
    return 'done';
  };

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  try {
    const outcome = await Promise.race([load(), timeout]);
    if (outcome === 'timeout') {
      controller.abort();
      logger.warn(
        `The first connector catalog load timed out after ${timeoutMs} ms. Only in-tree connector types are available.`
      );
    }
  } catch (error) {
    controller.abort();
    logger.warn(`The first connector catalog load failed: ${getErrorMessage(error)}`);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Follows the feature flag and runs the first catalog load once, when the flag is on.
 * With the flag off, nothing is read or created.
 */
export const startConnectorCatalog = (deps: StartConnectorCatalogDeps): ConnectorCatalogHandle => {
  const { featureFlags, logger, timeoutMs = CATALOG_FIRST_LOAD_TIMEOUT_MS } = deps;

  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  let loadStarted = false;

  // The flag provider can be slow or down, so ready must not depend on the first emission.
  const flagTimer = setTimeout(() => {
    logger.warn(
      `The connector catalog flag was not available after ${timeoutMs} ms. Only in-tree connector types are available.`
    );
    resolveReady();
  }, timeoutMs);
  const settle = () => {
    clearTimeout(flagTimer);
    resolveReady();
  };

  const subscription = featureFlags
    .getBooleanValue$(ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG, false)
    .subscribe({
      next: (enabled) => {
        if (!enabled) {
          settle();
          return;
        }
        if (loadStarted) {
          return;
        }
        loadStarted = true;
        clearTimeout(flagTimer);
        void runLoad(deps).then(settle);
      },
      error: (error: unknown) => {
        logger.warn(`The connector catalog flag could not be read: ${getErrorMessage(error)}`);
        settle();
      },
    });

  return {
    ready,
    stop: () => {
      clearTimeout(flagTimer);
      subscription.unsubscribe();
    },
  };
};
