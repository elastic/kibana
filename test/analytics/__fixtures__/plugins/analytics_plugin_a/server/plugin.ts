/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import type { Plugin, CoreSetup, CoreStart, TelemetryCounter } from 'src/core/server';
import type { Action } from './custom_shipper';
import { CustomShipper } from './custom_shipper';

export class AnalyticsPluginAPlugin implements Plugin {
  public setup({ analytics, http }: CoreSetup, deps: {}) {
    const {
      registerContextProvider,
      registerEventType,
      registerShipper,
      reportEvent,
      telemetryCounter$,
    } = analytics;

    const stats: TelemetryCounter[] = [];
    telemetryCounter$.subscribe((event) => stats.push(event));

    registerEventType({
      eventType: 'test-plugin-lifecycle',
      schema: {
        plugin: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the plugin',
          },
        },
        step: {
          type: 'keyword',
          _meta: {
            description: 'The lifecycle step in which the plugin is',
          },
        },
      },
    });

    // Report an event before the shipper is registered
    reportEvent('test-plugin-lifecycle', {
      plugin: 'analyticsPluginA',
      step: 'setup',
    });

    const actions$ = new ReplaySubject<Action>();
    registerShipper(CustomShipper, actions$);

    const router = http.createRouter();

    const context$ = new Subject();
    registerContextProvider({
      context$,
      schema: {
        custom_context: {
          type: 'pass_through',
          _meta: {
            description:
              'Passing through anything that is reported via the HTTP API below for testing',
          },
        },
      },
    });

    router.get(
      {
        path: '/internal/analytics_plugin_a/stats',
        validate: {
          query: schema.object({
            takeNumberOfCounters: schema.number({ min: 1 }),
          }),
        },
      },
      async (context, req, res) => {
        const { takeNumberOfCounters } = req.query;

        return res.ok({ body: stats.slice(-takeNumberOfCounters) });
      }
    );

    router.get(
      {
        path: '/internal/analytics_plugin_a/actions',
        validate: {
          query: schema.object({
            takeNumberOfActions: schema.number({ min: 1 }),
          }),
        },
      },
      async (context, req, res) => {
        const { takeNumberOfActions } = req.query;

        const actions = await actions$.pipe(take(takeNumberOfActions), toArray()).toPromise();

        return res.ok({ body: actions });
      }
    );
  }

  public start({ analytics }: CoreStart) {
    analytics.registerContextProvider({
      context$: new BehaviorSubject({ pid: process.pid }),
      schema: {
        pid: {
          type: 'short',
          _meta: {
            description: 'The Kibana process ID',
          },
        },
      },
    });

    analytics.reportEvent('test-plugin-lifecycle', {
      plugin: 'analyticsPluginA',
      step: 'start',
    });
  }

  public stop() {}
}
