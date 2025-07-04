/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { Logger, CoreStatus, IClusterClient } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import { TASK_MANAGER_INDEX } from '../constants';

export interface GetElasticsearchAndSOAvailabilityOpts {
  core$: Observable<CoreStatus>;
  isServerless: boolean;
  logger: Logger;
  getClusterClient: () => Promise<IClusterClient>;
}

export function getElasticsearchAndSOAvailability({
  core$,
  isServerless,
  logger,
  getClusterClient,
}: GetElasticsearchAndSOAvailabilityOpts): Observable<boolean> {
  let isEsHealthy = false;
  let isEsServiceAvailable = false;
  let isSoServiceAvailable = false;
  const result = new BehaviorSubject<boolean>(false);
  core$.subscribe(({ elasticsearch, savedObjects }) => {
    isEsServiceAvailable = elasticsearch.level === ServiceStatusLevels.available;
    isSoServiceAvailable = savedObjects.level === ServiceStatusLevels.available;
    result.next(isEsHealthy && isEsServiceAvailable && isSoServiceAvailable);
  });
  // Load cluster health to ensure task index is ready
  getClusterClient()
    .then((client) => {
      client.asInternalUser.cluster
        .health({
          wait_for_status: isServerless ? 'green' : 'yellow',
          timeout: '30s',
          index: TASK_MANAGER_INDEX,
        })
        .then((healthResult) => {
          logger.debug(`Cluster health: ${JSON.stringify(healthResult)}`);
          isEsHealthy = true;
          result.next(isEsHealthy && isEsServiceAvailable && isSoServiceAvailable);
        })
        .catch((e) => {
          logger.error(
            `Error loading the cluster health. The task poller will start regardless. Error: ${e.message}`
          );
          // Even if we can't load the cluster health, we should start the task
          // poller in case the issue is unrelated.
          isEsHealthy = true;
          result.next(isEsHealthy && isEsServiceAvailable && isSoServiceAvailable);
        });
    })
    .catch((e) => {
      logger.error(
        `Error loading the cluster client to fetch cluster health. The task poller will start regardless. Error: ${e.message}`
      );
      // Even if we can't load the cluster health, we should start the task
      // poller in case the issue is unrelated.
      isEsHealthy = true;
      result.next(isEsHealthy && isEsServiceAvailable && isSoServiceAvailable);
    });
  return result;
}
