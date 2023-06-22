/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import type { AnalyticsClientInitContext } from '@kbn/analytics-client';
import type { IShipper, Event } from '@kbn/core/server';

export class CustomShipper implements IShipper {
  public static shipperName = 'FTR-helpers-shipper';

  constructor(
    private readonly events$: Subject<Event>,
    private readonly initContext: AnalyticsClientInitContext
  ) {}

  public reportEvents(events: Event[]) {
    this.initContext.logger.info(
      `Reporting ${events.length} events to ${CustomShipper.shipperName}: ${JSON.stringify(events)}`
    );
    events.forEach((event) => {
      this.events$.next(event);
    });
  }
  optIn(isOptedIn: boolean) {}
  async flush() {}
  shutdown() {}
}
