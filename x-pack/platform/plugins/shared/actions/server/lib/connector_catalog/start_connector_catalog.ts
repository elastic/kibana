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
  /** Takes each value of the catalog flag. Only the first value counts. */
  onFlagValue: (enabled: boolean) => void;
  /** Takes an error of the flag stream. Logs at warn and resolves ready. */
  onFlagError: (error: unknown) => void;
  /** Clears the timer, aborts a running load, and makes later calls do nothing. */
  stop: () => void;
}

interface StartConnectorCatalogDeps {
  storage: Pick<ConnectorCatalogStorage, 'ensureIndex' | 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Creates the index, then registers the catalog types. Never rejects.
 * Stops at the timeout and aborts the pending requests, so a late result registers nothing.
 * When the controller is aborted from outside, it ends at once and quietly.
 */
const runLoad = async (
  { storage, actionTypeRegistry, buildType, logger, timeoutMs }: StartConnectorCatalogDeps,
  controller: AbortController
): Promise<void> => {
  const { signal } = controller;
  const loadTimeoutMs = timeoutMs ?? CATALOG_FIRST_LOAD_TIMEOUT_MS;

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
    timer = setTimeout(() => resolve('timeout'), loadTimeoutMs);
  });

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<'aborted'>((resolve) => {
    if (signal.aborted) {
      resolve('aborted');
      return;
    }
    onAbort = () => resolve('aborted');
    signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    const outcome = await Promise.race([load(), timeout, aborted]);
    if (outcome === 'timeout') {
      controller.abort();
      logger.warn(
        `The first connector catalog load timed out after ${loadTimeoutMs} ms. Only in-tree connector types are available.`
      );
    }
  } catch (error) {
    if (!signal.aborted) {
      controller.abort();
      logger.warn(`The first connector catalog load failed: ${getErrorMessage(error)}`);
    }
  } finally {
    clearTimeout(timer);
    if (onAbort) {
      signal.removeEventListener('abort', onAbort);
    }
  }
};

/**
 * Runs the first catalog load 1 time, when the first flag value is on.
 * With the flag off, nothing is read or created. Later flag values do nothing.
 */
export const startConnectorCatalog = (deps: StartConnectorCatalogDeps): ConnectorCatalogHandle => {
  const { logger, timeoutMs = CATALOG_FIRST_LOAD_TIMEOUT_MS } = deps;
  const controller = new AbortController();

  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  let decided = false;
  let loadRunning = false;

  // The flag provider can be slow or down, so ready must not depend on the first flag value.
  const flagTimer = setTimeout(() => {
    decided = true;
    logger.warn(
      `The connector catalog flag was not available after ${timeoutMs} ms. Only in-tree connector types are available.`
    );
    resolveReady();
  }, timeoutMs);

  const decide = () => {
    decided = true;
    clearTimeout(flagTimer);
  };

  return {
    ready,
    onFlagValue: (enabled) => {
      if (decided) {
        return;
      }
      decide();
      if (!enabled) {
        resolveReady();
        return;
      }
      loadRunning = true;
      void runLoad(deps, controller).then(() => {
        loadRunning = false;
        resolveReady();
      });
    },
    onFlagError: (error) => {
      if (decided) {
        return;
      }
      decide();
      logger.warn(`The connector catalog flag could not be read: ${getErrorMessage(error)}`);
      resolveReady();
    },
    stop: () => {
      decide();
      controller.abort();
      // A running load resolves ready itself, after it cleared its timer.
      if (!loadRunning) {
        resolveReady();
      }
    },
  };
};
