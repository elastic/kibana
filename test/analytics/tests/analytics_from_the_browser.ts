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
import '@kbn/analytics-plugin-a-plugin/public/types';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const browser = getService('browser');
  const ebtUIHelper = getService('kibana_ebt_ui');

  describe('analytics service: public side', () => {
    const getTelemetryCounters = async (
      _takeNumberOfCounters: number
    ): Promise<TelemetryCounter[]> => {
      return await browser.execute(
        ({ takeNumberOfCounters }) =>
          window.__analyticsPluginA__.stats
            .filter((counter) => counter.event_type === 'test-plugin-lifecycle')
            .slice(-takeNumberOfCounters),
        { takeNumberOfCounters: _takeNumberOfCounters }
      );
    };

    const getActions = async (): Promise<Action[]> => {
      return await browser.execute(() =>
        window.__analyticsPluginA__.getActionsUntilReportTestPluginLifecycleEvent()
      );
    };

    beforeEach(async () => {
      await common.navigateToApp('home');
    });

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

    it('after setting opt-in, it should extend the contexts and send the events', async () => {
      await ebtUIHelper.setOptIn(true);

      const actions = await getActions();

      const [_, extendContextAction, ...reportEventsActions] = actions;

      // Validating the remote user_agent because that's the only field that it's added by the FTR plugin.
      const context = extendContextAction.meta;
      expect(context).to.have.property('user_agent');
      expect(context.user_agent).to.be.a('string');

      reportEventsActions.forEach((reportEventAction) => {
        expect(reportEventAction.action).to.eql('reportEvents');
        // Get the first event type
        const initiallyBatchedEventType = reportEventAction.meta[0].event_type;
        // Check that all event types in this batch are the same.
        reportEventAction.meta.forEach((event: Event) => {
          expect(event.event_type).to.eql(initiallyBatchedEventType);
        });
      });

      // Find the action calling to report test-plugin-lifecycle events.
      const reportTestPluginLifecycleEventsAction = reportEventsActions.find(
        (reportEventAction) => {
          return (
            reportEventAction.action === 'reportEvents' &&
            reportEventAction.meta[0].event_type === 'test-plugin-lifecycle'
          );
        }
      );
      // Some context providers emit very early. We are OK with that.
      const initialContext = reportTestPluginLifecycleEventsAction!.meta[0].context;

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

      expect(reportEventContext).to.have.property('user_agent');
      expect(reportEventContext.user_agent).to.be.a('string');

      // Testing the FTR helper as well
      expect(await ebtUIHelper.getLastEvents(2, ['test-plugin-lifecycle'])).to.eql([
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
}
