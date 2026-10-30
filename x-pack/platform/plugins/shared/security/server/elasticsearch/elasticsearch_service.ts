/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  tap,
} from 'rxjs';

import type { Logger, StatusServiceSetup } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';

import type { SecurityLicense, SecurityLicenseFeatures } from '../../common';

export interface ElasticsearchServiceSetupParams {
  readonly status: StatusServiceSetup;
  readonly license: SecurityLicense;
}

export interface ElasticsearchServiceStart {
  readonly watchOnlineStatus$: () => Observable<OnlineStatusRetryScheduler>;
}

export interface OnlineStatusRetryScheduler {
  scheduleRetry: () => void;
}

interface OnlineStatus {
  isAvailable: boolean;
  licenseType: ReturnType<SecurityLicense['getLicenseType']>;
  features: SecurityLicenseFeatures;
}

/**
 * Service responsible for interactions with the Elasticsearch.
 */
export class ElasticsearchService {
  readonly #logger: Logger;
  #coreStatus$!: Observable<OnlineStatus>;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  setup({ status, license }: ElasticsearchServiceSetupParams) {
    this.#coreStatus$ = combineLatest([status.core$, license.features$]).pipe(
      map(([coreStatus, features]) => ({
        isAvailable:
          license.isEnabled() && coreStatus.elasticsearch.level === ServiceStatusLevels.available,
        // Privilege registration also depends on the license type (`hasAtLeast`), and the features
        // can't tell platinum from enterprise.
        licenseType: license.getLicenseType(),
        features,
      })),
      // `core$` also emits when the `http` or `savedObjects` status changes. Each emission resets
      // the retry backoff and starts a new run, so we only emit when something the tasks depend
      // on changes.
      distinctUntilChanged(isEqual),
      shareReplay(1)
    );
  }

  start(): ElasticsearchServiceStart {
    return {
      // Core's `status.core$` tells us whether Elasticsearch is available, but it doesn't combine
      // that with the license or schedule retries for work that fails while it's online, so we do
      // both here.
      watchOnlineStatus$: () => {
        const RETRY_BASE_DELAY = 1000;
        const RETRY_MAX_DELAY = 10000;
        const retries$ = new BehaviorSubject(0);

        const retryScheduler = {
          scheduleRetry: () => {
            const retriesElapsed = retries$.getValue() + 1;
            // Every Kibana instance that fails at the same time would otherwise retry at the same
            // time too. The delay doubles on each attempt up to the max, and we randomize the
            // upper half of it to spread instances out.
            const maxRetryTimeout = Math.min(
              RETRY_BASE_DELAY * 2 ** (retriesElapsed - 1),
              RETRY_MAX_DELAY
            );
            const nextRetryTimeout = Math.round(
              maxRetryTimeout / 2 + Math.random() * (maxRetryTimeout / 2)
            );

            this.#logger.debug(`Scheduling re-try in ${nextRetryTimeout} ms.`);

            // Only keep one pending retry, even if more than one failure asks for it.
            clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => retries$.next(retriesElapsed), nextRetryTimeout);
          },
        };

        let retryTimeout: NodeJS.Timeout;
        return combineLatest([
          this.#coreStatus$.pipe(
            tap(() => {
              // If status or license change occurred before retry timeout we should cancel
              // it and reset retry counter.
              if (retryTimeout) {
                clearTimeout(retryTimeout);
              }

              if (retries$.value > 0) {
                retries$.next(0);
              }
            })
          ),
          retries$.asObservable().pipe(
            // We shouldn't emit new value if retry counter is reset. This comparator isn't called for
            // the initial value.
            distinctUntilChanged((prev, curr) => prev === curr || curr === 0)
          ),
        ]).pipe(
          filter(([{ isAvailable }]) => isAvailable),
          map(() => retryScheduler)
        );
      },
    };
  }
}
