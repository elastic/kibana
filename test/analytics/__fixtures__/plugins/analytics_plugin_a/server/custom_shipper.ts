/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { TelemetryCounterType } from '@elastic/analytics';
import type { IShipper, Event, EventContext, TelemetryCounter } from '@kbn/core/server';

export interface Action {
  action: string;
  meta: any;
}

export class CustomShipper implements IShipper {
  public static shipperName = 'FTR-shipper';

  public telemetryCounter$ = new Subject<TelemetryCounter>();

  constructor(private readonly actions$: Subject<Action>) {}

  public reportEvents(events: Event[]) {
    this.actions$.next({ action: 'reportEvents', meta: events });
    events.forEach((event) => {
      this.telemetryCounter$.next({
        type: TelemetryCounterType.succeeded,
        event_type: event.event_type,
        code: '200',
        count: 1,
        source: 'random_value',
      });
    });
  }
  optIn(isOptedIn: boolean) {
    this.actions$.next({ action: 'optIn', meta: isOptedIn });
  }
  extendContext(newContext: EventContext) {
    this.actions$.next({ action: 'extendContext', meta: newContext });
  }
}
