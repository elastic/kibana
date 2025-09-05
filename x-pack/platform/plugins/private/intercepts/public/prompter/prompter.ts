/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
import { apm } from '@elastic/apm-rum';
import { InterceptDialogService, InterceptServiceStartDeps } from './service';
import { UserInterceptRunPersistenceService } from './service/user_intercept_run_persistence_service';
import { Intercept } from './service';
import { TRIGGER_INFO_API_ROUTE } from '../../common/constants';
import { TriggerInfo } from '../../common/types';

export type { Intercept } from './service';

type ProductInterceptPrompterSetupDeps = Pick<CoreSetup, 'analytics' | 'notifications'>;
type ProductInterceptPrompterStartDeps = Omit<
  InterceptServiceStartDeps,
  'persistInterceptRunId' | 'staticAssetsHelper'
> &
  Pick<CoreStart, 'http'>;

export class InterceptPrompter {
  private userInterceptRunPersistenceService = new UserInterceptRunPersistenceService();
  private interceptDialogService = new InterceptDialogService();
  private queueIntercept?: ReturnType<InterceptDialogService['start']>['add'];
  // observer for page visibility changes, shared across all intercepts
  private pageHidden$?: Rx.Observable<boolean>;
  // Defines safe timer bound at 24 days, javascript browser timers are not reliable for longer intervals
  // see https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#maximum_delay_value,
  // rxjs can do longer intervals, but we want to avoid the risk of running into issues with browser timers.
  private readonly MAX_TIMER_INTERVAL = 0x7b98a000; // 24 days in milliseconds

  setup({ analytics, notifications }: ProductInterceptPrompterSetupDeps) {
    this.interceptDialogService.setup({ analytics, notifications });

    return {};
  }

  start({ http, ...dialogServiceDeps }: ProductInterceptPrompterStartDeps) {
    const { getUserTriggerData$, updateUserTriggerData } =
      this.userInterceptRunPersistenceService.start(http);

    ({ add: this.queueIntercept } = this.interceptDialogService.start({
      ...dialogServiceDeps,
      persistInterceptRunId: updateUserTriggerData,
      staticAssetsHelper: http.staticAssets,
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
    let nextRunId: number;

    return Rx.from(
      http.post<NonNullable<TriggerInfo>>(TRIGGER_INFO_API_ROUTE, {
        body: JSON.stringify({
          triggerId: intercept.id,
        }),
      })
    )
      .pipe(Rx.filter((response) => !!response))
      .pipe(
        Rx.mergeMap((response) => {
          // anchor for all calculations, this is the time when the trigger was registered
          const timePoint = Date.now();

          let diff = 0;

          // Calculate the number of runs since the trigger was registered
          const runs = Math.floor(
            (diff = timePoint - Date.parse(response.registeredAt)) / response.triggerIntervalInMs
          );

          nextRunId = runs + 1;

          return this.pageHidden$!.pipe(
            Rx.switchMap((isHidden) => {
              if (isHidden) return Rx.EMPTY;

              return Rx.timer(
                Math.min(nextRunId * response.triggerIntervalInMs - diff, this.MAX_TIMER_INTERVAL),
                Math.min(response.triggerIntervalInMs, this.MAX_TIMER_INTERVAL)
              ).pipe(
                Rx.switchMap((timerIterationCount) => {
                  if (response.triggerIntervalInMs < this.MAX_TIMER_INTERVAL) {
                    return getUserTriggerData$(intercept.id);
                  } else {
                    const timeElapsedSinceRegistration =
                      diff + this.MAX_TIMER_INTERVAL * timerIterationCount;

                    const timeTillTriggerEvent =
                      nextRunId * response.triggerIntervalInMs - timeElapsedSinceRegistration;

                    if (timeTillTriggerEvent <= this.MAX_TIMER_INTERVAL) {
                      // trigger event would happen sometime within this current slice
                      // set up a single use timer that will emit the trigger event
                      return Rx.timer(timeTillTriggerEvent).pipe(
                        Rx.switchMap(() => {
                          return getUserTriggerData$(intercept.id);
                        })
                      );
                    } else {
                      // current timer slice requires no action
                      return Rx.EMPTY;
                    }
                  }
                }),
                Rx.takeWhile((triggerData) => {
                  // Stop the timer if lastInteractedInterceptId is defined and matches nextRunId
                  if (!response.recurrent && triggerData.lastInteractedInterceptId) {
                    return false;
                  }
                  return true;
                })
              );
            })
          );
        })
      )
      .pipe(
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
        })
      );
  }
}
