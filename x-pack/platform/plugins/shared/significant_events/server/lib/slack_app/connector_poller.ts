/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, exhaustMap, from, of, timer } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { SlackAppService } from './service';

const RECONCILE_INTERVAL_MS = 60_000;

/**
 * Keeps this process's Elastic Slack connector in line with the stored connection: in-memory
 * connectors are per-process, so a connect handled by another node never reaches here otherwise.
 */
export const createElasticAppsSlackConnectorPoller = ({
  server,
  logger,
  soClient,
  intervalMs = RECONCILE_INTERVAL_MS,
}: {
  server: StreamsServer;
  logger: Logger;
  soClient: SavedObjectsClientContract;
  intervalMs?: number;
}): Observable<unknown> => {
  const service = new SlackAppService(server);

  // `timer(0, …)` makes the first tick the startup restore. `catchError` must stay inside the inner
  // observable — outside, one failed tick would end the poller for the process's lifetime.
  return timer(0, intervalMs).pipe(
    exhaustMap(() =>
      from(service.reconcileConnector(soClient)).pipe(
        catchError((error: unknown) => {
          logger.warn(
            `Failed to reconcile the Elastic Slack connector: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return of(undefined);
        })
      )
    )
  );
};
