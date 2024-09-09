/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    it('should see both events enqueued and sent to the shipper', async () => {
      const telemetryCounters = await getTelemetryCounters(5);
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

    describe('after setting opt-in', () => {
      let actions: Action[];

      before(async () => {
        actions = await getActions();
      });

      it('it calls optIn first, then extendContext, followed by reportEvents', async () => {
        const [optInAction, extendContextAction, ...reportEventsAction] = actions;
        expect(optInAction).to.eql({ action: 'optIn', meta: true });
        expect(extendContextAction).to.have.property('action', 'extendContext');
        // Checking `some` because there could be more `extendContext` actions for late context providers
        expect(reportEventsAction.some((entry) => entry.action === 'reportEvents')).to.be(true);
      });

      it('Initial calls to reportEvents from cached events group the requests by event_type', async () => {
        // We know that after opting-in, the client will send the events in batches, grouped by event-type.
        const reportEventsActions = actions.filter(({ action }) => action === 'reportEvents');
        reportEventsActions.forEach((reportEventAction) => {
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
        const reportEventsActions = actions.filter(({ action }) => action === 'reportEvents');
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
        const events = await ebtServerHelper.getEvents(2, {
          eventTypes: ['test-plugin-lifecycle'],
        });
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

      it('it should extend the contexts with pid injected by "analytics_plugin_a"', async () => {
        const [event] = await ebtServerHelper.getEvents(1, {
          eventTypes: ['test-plugin-lifecycle'],
        });
        // Validating the remote PID because that's the only field that it's added by the FTR plugin.
        expect(event.context).to.have.property('pid');
        expect(event.context.pid).to.be.a('number');
      });

      describe('Test helpers capabilities', () => {
        it('should return the count of the events', async () => {
          const eventCount = await ebtServerHelper.getEventCount({
            withTimeoutMs: 500,
            eventTypes: ['test-plugin-lifecycle'],
          });
          expect(eventCount).to.be(2);
        });

        it('should return 0 events when filtering by timestamp', async () => {
          const eventCount = await ebtServerHelper.getEventCount({
            withTimeoutMs: 500,
            eventTypes: ['test-plugin-lifecycle'],
            fromTimestamp: new Date().toISOString(),
          });
          expect(eventCount).to.be(0);
        });
        it('should return 1 event when filtering by the latest timestamp', async () => {
          const events = await ebtServerHelper.getEvents(Number.MAX_SAFE_INTEGER, {
            withTimeoutMs: 500,
            eventTypes: ['test-plugin-lifecycle'],
          });
          expect(events.length).to.be.greaterThan(0);
          const lastEvent = events[events.length - 1];
          const fromTimestamp = new Date(new Date(lastEvent.timestamp).getTime() - 1).toISOString();
          const eventCount = await ebtServerHelper.getEventCount({
            withTimeoutMs: 500,
            eventTypes: ['test-plugin-lifecycle'],
            fromTimestamp,
          });
          expect(eventCount).to.be(1);
        });
      });
    });
  });
}
