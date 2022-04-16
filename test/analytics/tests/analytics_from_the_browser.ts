/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { TelemetryCounter } from '@kbn/core/server';
import { Action } from '@kbn/analytics-plugin-a-plugin/server/custom_shipper';
import { FtrProviderContext } from '../services';
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

    const getActions = async (takeNumberOfActions: number): Promise<Action[]> => {
      return await browser.execute(
        (count) => window.__analyticsPluginA__.getLastActions(count),
        takeNumberOfActions
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

      const actions = await getActions(3);

      // Validating the remote user_agent because that's the only field that it's added by the FTR plugin.
      const context = actions[1].meta;
      expect(context).to.have.property('user_agent');
      expect(context.user_agent).to.be.a('string');

      const reportEventContext = actions[2].meta[1].context;
      expect(reportEventContext).to.have.property('user_agent');
      expect(reportEventContext.user_agent).to.be.a('string');

      expect(actions).to.eql([
        { action: 'optIn', meta: true },
        { action: 'extendContext', meta: context },
        {
          action: 'reportEvents',
          meta: [
            {
              timestamp: actions[2].meta[0].timestamp,
              event_type: 'test-plugin-lifecycle',
              context: {},
              properties: { plugin: 'analyticsPluginA', step: 'setup' },
            },
            {
              timestamp: actions[2].meta[1].timestamp,
              event_type: 'test-plugin-lifecycle',
              context: reportEventContext,
              properties: { plugin: 'analyticsPluginA', step: 'start' },
            },
          ],
        },
      ]);

      // Testing the FTR helper as well
      expect(await ebtUIHelper.getLastEvents(2, ['test-plugin-lifecycle'])).to.eql([
        {
          timestamp: actions[2].meta[0].timestamp,
          event_type: 'test-plugin-lifecycle',
          context: {},
          properties: { plugin: 'analyticsPluginA', step: 'setup' },
        },
        {
          timestamp: actions[2].meta[1].timestamp,
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
