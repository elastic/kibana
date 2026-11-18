/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Observable,
  Subject,
  catchError,
  firstValueFrom,
  of,
  switchMap,
  take,
  takeUntil,
  timeout,
} from 'rxjs';
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
  /** Ends the pipeline, aborts a running load, and resolves ready without logs. */
  stop: () => void;
}

interface StartConnectorCatalogDeps {
  isEnabled$: Observable<boolean>;
  storage: Pick<ConnectorCatalogStorage, 'getManifest' | 'getDefinitions'>;
  actionTypeRegistry: Pick<ActionTypeRegistry, 'has' | 'register'>;
  buildType: (definition: StoredCatalogDefinition) => CatalogActionType;
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Runs the first catalog load 1 time, when the first flag value is on.
 * With the flag off, nothing is read or written. Later flag values do nothing.
 */
export const startConnectorCatalog = ({
  isEnabled$,
  storage,
  actionTypeRegistry,
  buildType,
  logger,
  timeoutMs = CATALOG_FIRST_LOAD_TIMEOUT_MS,
}: StartConnectorCatalogDeps): ConnectorCatalogHandle => {
  const stop$ = new Subject<void>();
  let loading = false;

  // Unsubscribing aborts the signal, so a timeout or stop cancels the load. A late result is dropped.
  const load$ = new Observable<void>((subscriber) => {
    const controller = new AbortController();
    const { signal } = controller;
    loading = true;
    loadCatalogConnectorTypes({ storage, actionTypeRegistry, buildType, logger, signal })
      .then((count) => {
        if (!signal.aborted) {
          logger.info(`Registered ${count} connector type(s) from the connector catalog.`);
        }
      })
      .catch((error: unknown) => {
        if (!signal.aborted) {
          logger.warn(`The first connector catalog load failed: ${getErrorMessage(error)}`);
        }
      })
      .finally(() => {
        subscriber.next();
        subscriber.complete();
      });
    return () => controller.abort();
  });

  // 1 deadline for the whole first load, from this call. The flag provider can be slow or down,
  // and a load can hang, so ready must not depend on either.
  const ready = firstValueFrom(
    isEnabled$.pipe(
      take(1),
      switchMap((enabled) => (enabled ? load$ : of(undefined))),
      timeout({
        first: timeoutMs,
        with: () => {
          logger.warn(
            loading
              ? `The first connector catalog load timed out after ${timeoutMs} ms. Only in-tree connector types are available.`
              : `The connector catalog flag was not available after ${timeoutMs} ms. Only in-tree connector types are available.`
          );
          return of(undefined);
        },
      }),
      catchError((error: unknown) => {
        logger.warn(`The connector catalog flag could not be read: ${getErrorMessage(error)}`);
        return of(undefined);
      }),
      takeUntil(stop$)
    ),
    { defaultValue: undefined }
  );

  return {
    ready,
    stop: () => {
      stop$.next();
      stop$.complete();
    },
  };
};
