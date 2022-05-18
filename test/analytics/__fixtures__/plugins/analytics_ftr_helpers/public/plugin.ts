/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReplaySubject, firstValueFrom, filter, take, toArray } from 'rxjs';
import type { Plugin, CoreSetup, Event } from '@kbn/core/public';
import { CustomShipper } from './custom_shipper';
import './types';

export class AnalyticsFTRHelpers implements Plugin {
  private readonly events$ = new ReplaySubject<Event>();

  public setup({ analytics }: CoreSetup) {
    analytics.registerShipper(CustomShipper, this.events$);

    window.__analytics_ftr_helpers__ = {
      setOptIn(optIn: boolean) {
        analytics.optIn({ global: { enabled: optIn } });
      },
      getLastEvents: async (takeNumberOfEvents, eventTypes = []) =>
        firstValueFrom(
          this.events$.pipe(
            filter((event) => {
              if (eventTypes.length > 0) {
                return eventTypes.includes(event.event_type);
              }
              return true;
            }),
            take(takeNumberOfEvents),
            toArray()
          )
        ),
    };
  }
  public start() {}
  public stop() {}
}
