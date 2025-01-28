/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { Plugin, CoreSetup, Event } from '@kbn/core/server';
import { fetchEvents } from '../common/fetch_events';
import { CustomShipper } from './custom_shipper';

export class AnalyticsFTRHelpers implements Plugin {
  public setup({ analytics, http }: CoreSetup, _deps: {}) {
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
      (_context, req, res) => {
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
            withTimeoutMs: schema.maybe(schema.number()),
            fromTimestamp: schema.maybe(schema.string()),
            filters: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.recordOf(
                  schema.oneOf([
                    schema.literal('eq'),
                    schema.literal('gte'),
                    schema.literal('gt'),
                    schema.literal('lte'),
                    schema.literal('lt'),
                  ]),
                  schema.any()
                )
              )
            ),
          }),
        },
      },
      async (_context, req, res) => {
        const { takeNumberOfEvents, ...options } = req.query;
        const events = await fetchEvents(events$, takeNumberOfEvents, options);
        return res.ok({ body: events });
      }
    );

    router.get(
      {
        path: '/internal/analytics_ftr_helpers/count_events',
        validate: {
          query: schema.object({
            eventTypes: schema.arrayOf(schema.string()),
            withTimeoutMs: schema.number(),
            fromTimestamp: schema.maybe(schema.string()),
            filters: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.recordOf(
                  schema.oneOf([
                    schema.literal('eq'),
                    schema.literal('gte'),
                    schema.literal('gt'),
                    schema.literal('lte'),
                    schema.literal('lt'),
                  ]),
                  schema.any()
                )
              )
            ),
          }),
        },
      },
      async (_context, req, res) => {
        const events = await fetchEvents(events$, Number.MAX_SAFE_INTEGER, req.query);
        return res.ok({ body: { count: events.length } });
      }
    );
  }

  public start() {}

  public stop() {}
}
