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
  /** Clears the deadline, aborts a running load, and makes later calls do nothing. */
  stop: () => void;
}

interface StartConnectorCatalogDeps {
  storage: Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Reads the catalog and registers its types. Never writes, so a missing index stays missing.
 * Never rejects.
 * Ends when the load is done or the controller is aborted. A late result registers nothing.
 * An abort from outside (stop or deadline) ends it at once and quietly.
 */
const runLoad = async (
  { storage, actionTypeRegistry, buildType, logger }: StartConnectorCatalogDeps,
  controller: AbortController
): Promise<void> => {
  const { signal } = controller;

  const load = async (): Promise<void> => {
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
  };

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    onAbort = () => resolve();
    signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    await Promise.race([load(), aborted]);
  } catch (error) {
    if (!signal.aborted) {
      controller.abort();
      logger.warn(`The first connector catalog load failed: ${getErrorMessage(error)}`);
    }
  } finally {
    if (onAbort) {
      signal.removeEventListener('abort', onAbort);
    }
  }
};

/**
 * Runs the first catalog load 1 time, when the first flag value is on.
 * With the flag off, nothing is read or written. Later flag values do nothing.
 */
export const startConnectorCatalog = (deps: StartConnectorCatalogDeps): ConnectorCatalogHandle => {
  const { logger, timeoutMs = CATALOG_FIRST_LOAD_TIMEOUT_MS } = deps;
  const controller = new AbortController();

  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  let decided = false;
  let loading = false;

  // 1 deadline for the whole first load, from this call. The flag provider can be slow or down,
  // and a load can hang, so ready must not depend on either.
  const deadline = setTimeout(() => {
    if (loading) {
      controller.abort();
      logger.warn(
        `The first connector catalog load timed out after ${timeoutMs} ms. Only in-tree connector types are available.`
      );
    } else if (!decided) {
      logger.warn(
        `The connector catalog flag was not available after ${timeoutMs} ms. Only in-tree connector types are available.`
      );
    }
    decided = true;
    resolveReady();
  }, timeoutMs);

  const finish = () => {
    decided = true;
    loading = false;
    clearTimeout(deadline);
    resolveReady();
  };

  return {
    ready,
    onFlagValue: (enabled) => {
      if (decided) {
        return;
      }
      decided = true;
      if (!enabled) {
        finish();
        return;
      }
      loading = true;
      void runLoad(deps, controller).then(finish);
    },
    onFlagError: (error) => {
      if (decided) {
        return;
      }
      logger.warn(`The connector catalog flag could not be read: ${getErrorMessage(error)}`);
      finish();
    },
    stop: () => {
      controller.abort();
      finish();
    },
  };
};
