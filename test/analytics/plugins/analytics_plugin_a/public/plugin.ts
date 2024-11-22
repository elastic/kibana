/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, firstValueFrom, ReplaySubject } from 'rxjs';
import { takeWhile, tap, toArray } from 'rxjs';
import type { Plugin, CoreSetup, CoreStart, TelemetryCounter, Event } from '@kbn/core/server';
import type { Action } from './custom_shipper';
import { CustomShipper } from './custom_shipper';
import './types';

export class AnalyticsPluginA implements Plugin {
  private readonly actions$ = new ReplaySubject<Action>();

  public setup({ analytics }: CoreSetup) {
    const {
      registerShipper,
      registerContextProvider,
      registerEventType,
      reportEvent,
      telemetryCounter$,
    } = analytics;
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
    let found = false;
    window.__analyticsPluginA__ = {
      getActionsUntilReportTestPluginLifecycleEvent: async () =>
        firstValueFrom(
          this.actions$.pipe(
            takeWhile(() => !found),
            tap((action) => {
              found = isTestPluginLifecycleReportEventAction(action);
            }),
            // Filter only the actions that are relevant to this plugin
            filter(
              ({ action, meta }) =>
                ['optIn', 'extendContext'].includes(action) ||
                isTestPluginLifecycleReportEventAction({ action, meta })
            ),
            toArray()
          )
        ),
      stats,
      setOptIn(optIn: boolean) {
        analytics.optIn({ global: { enabled: optIn } });
      },
      getFlushAction: async () =>
        firstValueFrom(this.actions$.pipe(filter(({ action }) => action === 'flush'))),
    };

    registerContextProvider({
      name: 'analyticsPluginA',
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
  }
  public start({ analytics }: CoreStart) {
    analytics.reportEvent('test-plugin-lifecycle', {
      plugin: 'analyticsPluginA',
      step: 'start',
    });
  }
  public stop() {}
}

function isTestPluginLifecycleReportEventAction({ action, meta }: Action): boolean {
  return (
    action === 'reportEvents' &&
    meta.find((event: Event) => event.event_type === 'test-plugin-lifecycle')
  );
}
