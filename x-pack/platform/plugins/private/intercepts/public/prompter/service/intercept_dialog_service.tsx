/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { ComponentProps } from 'react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { HttpStart } from '@kbn/core-http-browser';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import { InterceptDialogApi } from './intercept_dialog_api';
import type { UserInterceptRunPersistenceService } from './user_intercept_run_persistence_service';
import {
  type Intercept,
  InterceptDisplayManagerMemoized,
} from '../component/intercept_display_manager';

export interface InterceptServiceSetupDeps {
  analytics: AnalyticsServiceSetup;
  notifications: NotificationsSetup;
}

export interface InterceptServiceStartDeps {
  analytics: AnalyticsServiceStart;
  rendering: RenderingService;
  targetDomElement: HTMLElement;
  persistInterceptRunId: ReturnType<
    UserInterceptRunPersistenceService['start']
  >['updateUserTriggerData'];
  staticAssetsHelper: HttpStart['staticAssets'];
  resetInterceptTimingRecord: (interceptId: Intercept['id']) => void;
}

export class InterceptDialogService {
  private readonly api = new InterceptDialogApi();
  private targetDomElement?: HTMLElement;
  private notificationsCoordinator?: ReturnType<NotificationsSetup['coordinator']>;
  private interceptsStream$?: Rx.Observable<Intercept>;

  setup({ analytics, notifications }: InterceptServiceSetupDeps) {
    this.api.setup({ analytics });

    this.notificationsCoordinator = notifications.coordinator(InterceptDialogService.name);

    return {};
  }

  public start({
    targetDomElement,
    rendering,
    analytics,
    staticAssetsHelper,
    persistInterceptRunId: persistInterceptRunInteraction,
    resetInterceptTimingRecord,
  }: InterceptServiceStartDeps) {
    const { ack, add, get$ } = this.api.start({ analytics });
    this.targetDomElement = targetDomElement;

    if (!this.notificationsCoordinator) {
      throw new Error('Notifications coordinator is not initialized');
    }

    // leverages the notifications coordinator to ensure that we are not showing
    // intercepts when the user is interacting with other notifications
    // (e.g. toast notifications)
    this.interceptsStream$ = this.notificationsCoordinator
      .optInToCoordination(get$(), ({ locked }) => !locked)
      .pipe(
        Rx.scan((pendingInterceptsQueue, incomingIntercepts) => {
          const pendingInterceptIds = pendingInterceptsQueue.map((intercept) => intercept.id);

          const newIncomingIntercepts = incomingIntercepts.filter(
            (intercept) => !pendingInterceptIds.includes(intercept.id)
          );

          // Here we only return the new incoming intercepts,
          // because we intend to hold on to all previous intercept values till they can be emitted
          // under the conditions we define
          return newIncomingIntercepts;
        }, [] as Intercept[]),
        // don't emit on empty
        Rx.filter((pendingInterceptsQueue) => Boolean(pendingInterceptsQueue.length)),
        Rx.concatMap((pendingInterceptsQueue) => {
          return Rx.from(pendingInterceptsQueue).pipe(
            Rx.concatMap((item) =>
              this.notificationsCoordinator!.lock$.pipe(
                Rx.filter(
                  (lockState) =>
                    !lockState.locked || lockState.controller === InterceptDialogService.name
                ),
                Rx.take(1), // Wait until the lock is available, then proceed
                Rx.tap((lockState) => {
                  if (!lockState.locked) {
                    this.notificationsCoordinator!.acquireLock();
                  }
                }),
                Rx.map(() => item)
              )
            )
          );
        })
      );

    const ackIntercept = (
      ...args: Parameters<ComponentProps<typeof InterceptDisplayManagerMemoized>['ackIntercept']>
    ) => {
      const [{ runId, ...ackArgs }] = args;

      ack(ackArgs);

      // Reset the timer start record, so the next interval starts fresh
      resetInterceptTimingRecord(ackArgs.interceptId);

      // persist the intercept interaction to the user trigger data
      persistInterceptRunInteraction(ackArgs.interceptId, runId);

      // Release acquired lock after user acknowledges the intercept
      // This allows the next queued item in the co-ordination queue (if any) to be processed automatically
      this.notificationsCoordinator?.releaseLock();
    };

    render(
      rendering.addContext(
        <InterceptDisplayManagerMemoized
          {...{
            intercept$: this.interceptsStream$,
            ackIntercept,
            staticAssetsHelper,
          }}
        />
      ),
      this.targetDomElement
    );

    return {
      add,
    };
  }

  stop() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
    }
  }
}

export type InterceptDialogServiceStart = ReturnType<InterceptDialogApi['start']>;
