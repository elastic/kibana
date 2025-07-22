/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import React, { ComponentProps } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { HttpStart } from '@kbn/core-http-browser';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import { InterceptDialogApi } from './intercept_dialog_api';
import { UserInterceptRunPersistenceService } from './user_intercept_run_persistence_service';
import { InterceptDisplayManager } from '../component/intercept_display_manager';

interface InterceptServiceSetupDeps {
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
}

export class InterceptDialogService {
  private readonly api = new InterceptDialogApi();
  private targetDomElement?: HTMLElement;
  private notificationsCoordinator?: ReturnType<NotificationsSetup['coordinator']>;

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
  }: InterceptServiceStartDeps) {
    const { ack, add, get$ } = this.api.start({ analytics });
    this.targetDomElement = targetDomElement;

    if (!this.notificationsCoordinator) {
      throw new Error('Notifications coordinator is not initialized');
    }

    // leverage the notifications coordinator to ensure that we are not showing
    // multiple intercepts at the same time, and that we are not showing
    // intercepts when the user is interacting with other notifications
    // (e.g. toast notifications)
    const intercept$ = this.notificationsCoordinator
      .optInToCoordination(get$(), ({ locked }) => !locked)
      .pipe(
        Rx.mergeMap((x) => x),
        // since the backing store for product intercepts accepts all queued intercepts,
        // we might receive a list of intercepts that should be attended to,
        // hence we attempt to present them serially to the user, without interrupting other queued notification types
        Rx.delayWhen(() =>
          this.notificationsCoordinator!.lock$.pipe(
            Rx.filter(({ controller }) => controller === InterceptDialogService.name)
          )
        )
      );

    const ackIntercept = (
      ...args: Parameters<ComponentProps<typeof InterceptDisplayManager>['ackIntercept']>
    ) => {
      const [{ runId, ...ackArgs }] = args;

      ack(ackArgs);

      persistInterceptRunInteraction(ackArgs.interceptId, runId);

      // we release the coordination lock on processing the user's acknowledgement of the product intercept,
      // so that any other pending notification can be shown
      this.notificationsCoordinator?.releaseLock();
    };

    render(
      rendering.addContext(
        <InterceptDisplayManager
          {...{
            intercept$,
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
