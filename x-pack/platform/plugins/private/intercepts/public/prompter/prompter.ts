/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
import { apm } from '@elastic/apm-rum';
import type { InterceptServiceStartDeps } from './service';
import { InterceptDialogService } from './service';
import { UserInterceptRunPersistenceService } from './service/user_intercept_run_persistence_service';
import type { Intercept } from './service';
import {
  TRIGGER_INFO_API_ROUTE,
  INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
} from '../../common/constants';
import type { TriggerInfo } from '../../common/types';

export type { Intercept } from './service';

type ProductInterceptPrompterSetupDeps = Pick<CoreSetup, 'analytics' | 'notifications'>;
type ProductInterceptPrompterStartDeps = Omit<
  InterceptServiceStartDeps,
  'persistInterceptRunId' | 'staticAssetsHelper' | 'resetInterceptTimingRecord'
> &
  Pick<CoreStart, 'http'> & { userAllowsFeedback: boolean };

export class InterceptPrompter {
  private userInterceptRunPersistenceService = new UserInterceptRunPersistenceService();
  private interceptDialogService = new InterceptDialogService();
  private queueIntercept?: ReturnType<InterceptDialogService['start']>['add'];
  // observer for page visibility changes, shared across all intercepts
  private pageHidden$?: Rx.Observable<boolean>;
  private userAllowsFeedback?: boolean;

  // Registry for intercept timers, used to track activation of a particular intercept for each user
  private interceptTimerRegistry = new Proxy<Record<Intercept['id'], { timerStart: Date }>>(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === 'symbol') return undefined;
        const storage = JSON.parse(
          localStorage.getItem(INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY) || '{}'
        );
        return storage[prop];
      },
      set: (_target, prop, value) => {
        if (typeof prop === 'symbol') return false;
        const storage = JSON.parse(
          localStorage.getItem(INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY) || '{}'
        );
        storage[prop] = value;
        localStorage.setItem(INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY, JSON.stringify(storage));
        return true;
      },
      deleteProperty: (_target, prop) => {
        if (typeof prop === 'symbol') return false;
        const storage = JSON.parse(
          localStorage.getItem(INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY) || '{}'
        );
        delete storage[prop];
        localStorage.setItem(INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY, JSON.stringify(storage));
        return true;
      },
    }
  );

  setup({ analytics, notifications }: ProductInterceptPrompterSetupDeps) {
    this.interceptDialogService.setup({ analytics, notifications });

    return {};
  }

  start({ http, userAllowsFeedback, ...dialogServiceDeps }: ProductInterceptPrompterStartDeps) {
    this.userAllowsFeedback = userAllowsFeedback;

    const { getUserTriggerData$, updateUserTriggerData } =
      this.userInterceptRunPersistenceService.start(http);

    ({ add: this.queueIntercept } = this.interceptDialogService.start({
      ...dialogServiceDeps,
      persistInterceptRunId: updateUserTriggerData,
      staticAssetsHelper: http.staticAssets,
      resetInterceptTimingRecord: this.clearInterceptTimerStartRecord.bind(this),
    }));

    this.pageHidden$ = Rx.fromEvent(document, 'visibilitychange').pipe(
      Rx.map(() => document.hidden),
      Rx.startWith(document.hidden)
    );

    return {
      /**
       * Configures the intercept journey that will be shown to the user, and returns an observable
       * that manages displaying the intercept at the appropriate time based on the interval that's been pre-configured for the
       * trigger ID matching the ID of this particular journey being configured.
       */
      registerIntercept: this.registerIntercept.bind(this, http, getUserTriggerData$),
    };
  }

  private registerIntercept(
    http: CoreStart['http'],
    getUserTriggerData$: ReturnType<
      UserInterceptRunPersistenceService['start']
    >['getUserTriggerData$'],
    intercept: {
      id: Intercept['id'];
      config: () => Promise<Omit<Intercept, 'id'>>;
    }
  ) {
    if (!this.userAllowsFeedback) return Rx.EMPTY;

    return Rx.from(
      http.post<NonNullable<TriggerInfo>>(TRIGGER_INFO_API_ROUTE, {
        body: JSON.stringify({
          triggerId: intercept.id,
        }),
      })
    )
      .pipe(Rx.filter((response) => !!response))
      .pipe(
        Rx.combineLatestWith(getUserTriggerData$(intercept.id)),
        Rx.switchMap(([response, userTriggerData]) => {
          if (!response.recurrent && userTriggerData && userTriggerData.lastInteractedInterceptId) {
            // if the intercept is not recurrent and the user has already interacted with it,
            // there's nothing to do
            return Rx.EMPTY;
          }

          let nextRunId: number;

          return this.pageHidden$!.pipe(
            Rx.switchMap((isHidden) => {
              // if the page is hidden, there's no need to run computations on whether to display the intercept or not
              if (isHidden) return Rx.EMPTY;

              const timerCalculations = this.calculateTimeTillTrigger(
                response.registeredAt,
                response.triggerIntervalInMs
              );

              // set the next run id
              nextRunId = timerCalculations.nextRunId;

              const now = Date.now();
              const timerStart = this.interceptTimerStartRecord(intercept.id).getTime();
              const timeElapsedSinceTimerStart = now - timerStart;

              if (timeElapsedSinceTimerStart >= response.triggerIntervalInMs) {
                // fetch user trigger again because it's possible that the user has already interacted with the intercept,
                // especially that the user might have interacted with the intercept in a different tab
                return getUserTriggerData$(intercept.id);
              } else {
                // Not yet time, return EMPTY to skip this iteration
                return Rx.EMPTY;
              }
            })
          ).pipe(
            Rx.tap(async (triggerData) => {
              if (nextRunId !== triggerData.lastInteractedInterceptId) {
                try {
                  const interceptConfig = await intercept.config();
                  this.queueIntercept?.({ id: intercept.id, runId: nextRunId, ...interceptConfig });
                  nextRunId++;
                } catch (err) {
                  apm.captureError(err, {
                    labels: {
                      interceptId: intercept.id,
                    },
                  });
                }
              }
            }),
            Rx.catchError((error) => {
              apm.captureError(error, {
                labels: {
                  interceptId: intercept.id,
                  errorContext: 'registerIntercept',
                },
              });
              return Rx.EMPTY;
            })
          );
        })
      );
  }

  public calculateTimeTillTrigger(registeredAt: string, triggerIntervalInMs: number) {
    const now = Date.now();
    const diff = now - Date.parse(registeredAt);
    const runs = Math.floor(diff / triggerIntervalInMs);
    const nextRunId = runs + 1;
    const timeTillNextRun = nextRunId * triggerIntervalInMs - diff;

    return {
      runs,
      shouldTriggerImmediately: timeTillNextRun <= 0,
      timeTillNextRun,
      nextRunId,
    };
  }

  private markInterceptTimerStart(interceptId: Intercept['id']) {
    this.interceptTimerRegistry[interceptId] = { timerStart: new Date() };
  }

  /**
   * Returns the date and time when the intercept timer was started for the given intercept id
   * If no record exists, it sets it to the current date and time and returns this value
   */
  private interceptTimerStartRecord(interceptId: Intercept['id']) {
    if (!this.interceptTimerRegistry[interceptId]) {
      this.markInterceptTimerStart(interceptId);
    }

    return new Date(this.interceptTimerRegistry[interceptId].timerStart);
  }

  private clearInterceptTimerStartRecord(interceptId: Intercept['id']) {
    delete this.interceptTimerRegistry[interceptId];
  }
}
