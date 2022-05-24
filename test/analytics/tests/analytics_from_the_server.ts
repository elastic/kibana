/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { Event, TelemetryCounter } from '@kbn/core/server';
import type { Action } from '@kbn/analytics-plugin-a-plugin/server/custom_shipper';
import type { FtrProviderContext } from '../services';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ebtServerHelper = getService('kibana_ebt_server');

  const getTelemetryCounters = async (
    takeNumberOfCounters: number
  ): Promise<TelemetryCounter[]> => {
    const resp = await supertest
      .get(`/internal/analytics_plugin_a/stats`)
      .query({ takeNumberOfCounters, eventType: 'test-plugin-lifecycle' })
      .set('kbn-xsrf', 'xxx')
      .expect(200);

    return resp.body;
  };

  const getActions = async (): Promise<Action[]> => {
    const resp = await supertest
      .get(`/internal/analytics_plugin_a/actions`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);

    return resp.body;
  };

  describe('analytics service: server side', () => {
    // this test should run first because it depends on optInConfig being undefined
    it('should have internally enqueued the "lifecycle" events but not handed over to the shipper yet', async () => {
      const telemetryCounters = await getTelemetryCounters(2);
      expect(telemetryCounters).to.eql([
        {
          type: 'enqueued',
          event_type: 'test-plugin-lifecycle',
          source: 'client',
          code: 'enqueued',
          count: 1,
        },
        {
          type: 'enqueued',
          event_type: 'test-plugin-lifecycle',
          source: 'client',
          code: 'enqueued',
          count: 1,
        },
      ]);
    });

    describe('after setting opt-in', () => {
      let actions: Action[];
      let context: Action['meta'];

      before(async () => {
        await ebtServerHelper.setOptIn(true);
        actions = await getActions();
        context = actions[1].meta;
      });

      it('it should extend the contexts with pid injected by "analytics_plugin_a"', async () => {
        // Validating the remote PID because that's the only field that it's added by the FTR plugin.
        expect(context).to.have.property('pid');
        expect(context.pid).to.be.a('number');
      });

      it('it calls optIn first, then extendContext, followed by reportEvents', async () => {
        const [optInAction, extendContextAction, ...reportEventsAction] = actions;
        expect(optInAction).to.eql({ action: 'optIn', meta: true });
        expect(extendContextAction).to.eql({ action: 'extendContext', meta: context });
        reportEventsAction.forEach((entry) => expect(entry.action).to.eql('reportEvents'));
      });

      it('Initial calls to reportEvents from cached events group the requests by event_type', async () => {
        // We know that after opting-in, the client will send the events in batches, grouped by event-type.
        const [, , ...reportEventsActions] = actions;
        reportEventsActions.forEach((reportEventAction) => {
          expect(reportEventAction.action).to.eql('reportEvents');
          // Get the first event type
          const initiallyBatchedEventType = reportEventAction.meta[0].event_type;
          // Check that all event types in this batch are the same.
          reportEventAction.meta.forEach((event: Event) => {
            expect(event.event_type).to.eql(initiallyBatchedEventType);
          });
        });
      });

      it('"test-plugin-lifecycle" is received in the expected order of "setup" first, then "start"', async () => {
        // We know that after opting-in, the client will send the events in batches, grouped by event-type.
        const [, , ...reportEventsActions] = actions;
        // Find the action calling to report test-plugin-lifecycle events.
        const reportTestPluginLifecycleEventsAction = reportEventsActions.find(
          (reportEventAction) => {
            return (
              reportEventAction.action === 'reportEvents' &&
              reportEventAction.meta[0].event_type === 'test-plugin-lifecycle'
            );
          }
        );
        // Find the setup and start events and validate that they are sent in the correct order.
        const initialContext = reportTestPluginLifecycleEventsAction!.meta[0].context; // read this from the reportTestPlugin
        const reportEventContext = reportTestPluginLifecycleEventsAction!.meta[1].context;
        const setupEvent = reportTestPluginLifecycleEventsAction!.meta.findIndex(
          (event: Event) =>
            event.event_type === 'test-plugin-lifecycle' &&
            event.properties.plugin === 'analyticsPluginA' &&
            event.properties.step === 'setup'
        );

        const startEvent = reportTestPluginLifecycleEventsAction!.meta.findIndex(
          (event: Event) =>
            event.event_type === 'test-plugin-lifecycle' &&
            event.properties.plugin === 'analyticsPluginA' &&
            event.properties.step === 'start'
        );

        expect(setupEvent).to.be.greaterThan(-1);
        expect(startEvent).to.be.greaterThan(setupEvent);

        // This helps us to also test the helpers
        const events = await ebtServerHelper.getLastEvents(2, ['test-plugin-lifecycle']);
        expect(events).to.eql([
          {
            timestamp: reportTestPluginLifecycleEventsAction!.meta[setupEvent].timestamp,
            event_type: 'test-plugin-lifecycle',
            context: initialContext,
            properties: { plugin: 'analyticsPluginA', step: 'setup' },
          },
          {
            timestamp: reportTestPluginLifecycleEventsAction!.meta[startEvent].timestamp,
            event_type: 'test-plugin-lifecycle',
            context: reportEventContext,
            properties: { plugin: 'analyticsPluginA', step: 'start' },
          },
        ]);
      });

      it('should report the plugin lifecycle events as telemetry counters', async () => {
        const telemetryCounters = await getTelemetryCounters(3);
        expect(telemetryCounters).to.eql([
          {
            type: 'succeeded',
            event_type: 'test-plugin-lifecycle',
            source: 'FTR-shipper',
            code: '200',
            count: 1,
          },
          {
            type: 'succeeded',
            event_type: 'test-plugin-lifecycle',
            source: 'FTR-shipper',
            code: '200',
            count: 1,
          },
          {
            type: 'sent_to_shipper',
            event_type: 'test-plugin-lifecycle',
            source: 'client',
            code: 'OK',
            count: 2,
          },
        ]);
      });
    });
  });
}
