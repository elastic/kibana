/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import type { Plugin, CoreSetup, TelemetryCounter, CoreStart } from 'src/core/public';
import type { Action } from './custom_shipper';
import { CustomShipper } from './custom_shipper';
import './types';

export class AnalyticsPluginA implements Plugin {
  private readonly actions$ = new ReplaySubject<Action>();

  public setup({ analytics }: CoreSetup) {
    const { registerShipper, registerEventType, reportEvent, telemetryCounter$ } = analytics;
    registerShipper(CustomShipper, this.actions$);

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

    window.__analyticsPluginA__ = {
      getLastActions: async (takeNumberOfActions: number) =>
        this.actions$.pipe(take(takeNumberOfActions), toArray()).toPromise(),
      stats,
      setOptIn(optIn: boolean) {
        analytics.optIn({ global: { enabled: optIn } });
      },
    };
  }
  public start({ analytics }: CoreStart) {
    analytics.registerContextProvider({
      context$: new BehaviorSubject({ user_agent: navigator.userAgent }).asObservable(),
      schema: {
        user_agent: {
          type: 'keyword',
          _meta: {
            description: 'The user agent of the browser',
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
