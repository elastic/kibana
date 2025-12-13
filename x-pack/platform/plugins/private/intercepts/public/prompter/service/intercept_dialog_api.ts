/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import * as Rx from 'rxjs';

import { InterceptTelemetry } from './telemetry';

export interface InterceptSteps extends Pick<EuiTourStepProps, 'title'> {
  id: string;
  /**
   * expects a react component that will be rendered in the dialog, and expects a callback to be called with the value
   * of the step when the user is done with the step.
   */
  content: FC<{ onValue: (value: unknown) => void }>;
}

interface StartingInterceptStep extends InterceptSteps {
  id: 'start';
}

interface CompletionInterceptStep extends InterceptSteps {
  id: 'completion';
}

interface InterceptProgressEvent {
  runId: Intercept['runId'];
  stepId: string;
  stepResponse: unknown;
}

interface InterceptCompletionEvent {
  runId: Intercept['runId'];
  response: Record<string, unknown>;
}

interface InterceptDismissalEvent {
  runId: Intercept['runId'];
  stepId: string;
}

/**
 * @internal
 */
export interface Intercept {
  /**
   * Unique identifier for the intercept, value provided must match the Id used when registering the trigger condition for said intercept.
   */
  id: string;
  runId: number;
  steps: [StartingInterceptStep, ...InterceptSteps[], CompletionInterceptStep];
  /**
   * Provides the response of the user interaction with the dialog for a particular step. Progress will not fire for the start or completion steps.
   */
  onProgress?: (evt: InterceptProgressEvent) => void;
  /**
   * Provides the response of the users interaction within the dialog as a object with keys corresponding to the id of the steps.
   */
  onFinish: (evt: InterceptCompletionEvent) => void;
  onDismiss?: (evt: InterceptDismissalEvent) => void;
}

/**
 * @public
 */
export type InterceptWithoutRunId = Omit<Intercept, 'runId'>;

interface InterceptDialogApiStartDeps {
  analytics: AnalyticsServiceStart;
}

interface InterceptDialogApiSetupDeps {
  analytics: AnalyticsServiceSetup;
}

export class InterceptDialogApi {
  private readonly telemetry = new InterceptTelemetry();
  private productIntercepts$ = new Rx.BehaviorSubject<Intercept[]>([]);
  private eventReporter?: ReturnType<InterceptTelemetry['start']>;

  setup({ analytics }: InterceptDialogApiSetupDeps) {
    this.telemetry.setup({ analytics });

    return {};
  }

  start({ analytics }: InterceptDialogApiStartDeps) {
    this.eventReporter = this.telemetry.start({ analytics });

    return {
      add: this.add.bind(this),
      ack: this.ack.bind(this),
      get$: this.get$.bind(this),
    };
  }

  private get$() {
    return this.productIntercepts$.asObservable();
  }

  private add(productIntercept: Intercept): string {
    const existingIntercepts = this.productIntercepts$.getValue();

    if (existingIntercepts.some((intercept) => intercept.id === productIntercept.id)) {
      this.eventReporter?.reportInterceptOverload({ interceptId: productIntercept.id });
    } else {
      // order is important so we can operate on a FIFO basis
      this.productIntercepts$.next([productIntercept, ...existingIntercepts]);

      this.eventReporter?.reportInterceptRegistration({ interceptId: productIntercept.id });
    }

    return productIntercept.id;
  }

  /**
   * @description expected to be called when a user is determined to have acknowledged the intercept for which the id is provided
   */
  private ack({
    interactionDuration,
    interceptId,
    ackType,
  }: {
    ackType: 'dismissed' | 'completed';
  } & Omit<
    Parameters<NonNullable<typeof this.eventReporter>['reportInterceptInteraction']>[0],
    'interactionType'
  >): void {
    this.productIntercepts$.next(
      this.productIntercepts$.getValue().filter((intercept) => intercept.id !== interceptId)
    );

    this.eventReporter?.reportInterceptInteraction({
      interactionType: ackType,
      interactionDuration,
      interceptId,
    });
  }
}
