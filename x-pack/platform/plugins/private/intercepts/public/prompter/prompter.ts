/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
import { InterceptDialogService, InterceptServiceStartDeps } from './service';
import { UserInterceptRunPersistenceService } from './service/user_intercept_run_persistence_service';
import { Intercept } from './service';
import { TRIGGER_INFO_API_ROUTE } from '../../common/constants';
import { TriggerInfo } from '../../common/types';

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
    intercept: Intercept
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
          const now = Date.now();
          let diff = 0;

          // Calculate the number of runs since the trigger was registered
          const runs = Math.floor(
            (diff = now - Date.parse(response.registeredAt)) / response.triggerIntervalInMs
          );

          nextRunId = runs + 1;

          // Calculate the time until the next run
          const nextRun = nextRunId * response.triggerIntervalInMs - diff;

          return Rx.timer(nextRun, response.triggerIntervalInMs).pipe(
            Rx.switchMap(() => getUserTriggerData$(intercept.id)),
            Rx.takeWhile((triggerData) => {
              // Stop the timer if lastInteractedInterceptId is defined and matches nextRunId
              if (!response.recurrent && triggerData.lastInteractedInterceptId) {
                return false;
              }
              return true;
            })
          );
        })
      )
      .pipe(
        Rx.tap((triggerData) => {
          if (nextRunId !== triggerData.lastInteractedInterceptId) {
            this.queueIntercept?.({ ...intercept, runId: nextRunId });
            nextRunId++;
          }
        })
      );
  }
}
