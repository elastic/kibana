/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, ReplaySubject, filter, take, toArray, map } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { Plugin, CoreSetup, Event } from '@kbn/core/server';
import { CustomShipper } from './custom_shipper';

export class AnalyticsFTRHelpers implements Plugin {
  public setup({ analytics, http }: CoreSetup, deps: {}) {
    const { optIn, registerShipper } = analytics;

    const events$ = new ReplaySubject<Event>();
    registerShipper(CustomShipper, events$);

    const router = http.createRouter();

    router.post(
      {
        path: '/internal/analytics_ftr_helpers/opt_in',
        validate: {
          query: schema.object({
            consent: schema.boolean(),
          }),
        },
      },
      (context, req, res) => {
        const { consent } = req.query;

        optIn({ global: { enabled: consent } });

        return res.ok();
      }
    );

    router.get(
      {
        path: '/internal/analytics_ftr_helpers/events',
        validate: {
          query: schema.object({
            takeNumberOfEvents: schema.number({ min: 1 }),
            eventTypes: schema.arrayOf(schema.string()),
          }),
        },
      },
      async (context, req, res) => {
        const { takeNumberOfEvents, eventTypes } = req.query;

        const events = await firstValueFrom(
          events$.pipe(
            filter((event) => {
              if (eventTypes.length > 0) {
                return eventTypes.includes(event.event_type);
              }
              return true;
            }),
            take(takeNumberOfEvents),
            toArray(),
            // Sorting the events by timestamp... on CI it's happening an event may occur while the client is still forwarding the early ones...
            map((_events) =>
              _events.sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              )
            )
          )
        );

        return res.ok({ body: events });
      }
    );
  }

  public start() {}

  public stop() {}
}
