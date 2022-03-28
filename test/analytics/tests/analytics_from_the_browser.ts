/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { TelemetryCounter } from 'src/core/server';
import { FtrProviderContext } from '../services';
import { Action } from '../__fixtures__/plugins/analytics_plugin_a/server/custom_shipper';
import '../__fixtures__/plugins/analytics_plugin_a/public/types';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const browser = getService('browser');

  describe('analytics service: public side', () => {
    const getTelemetryCounters = async (
      _takeNumberOfCounters: number
    ): Promise<TelemetryCounter[]> => {
      return await browser.execute(
        ({ takeNumberOfCounters }) =>
          window.__analyticsPluginA__.stats.slice(-takeNumberOfCounters),
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
      await browser.execute(() => window.__analyticsPluginA__.setOptIn(true));

      const actions = await getActions(3);
      // Treating the PID as remote because the tests may run the server in a separate process to the suites
      const remoteUserAgent = actions[1].meta.user_agent;
      expect(actions).to.eql([
        { action: 'optIn', meta: true },
        { action: 'extendContext', meta: { user_agent: remoteUserAgent } },
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
              context: { user_agent: remoteUserAgent },
              properties: { plugin: 'analyticsPluginA', step: 'start' },
            },
          ],
        },
      ]);

      expect(remoteUserAgent).to.be.a('string');

      const telemetryCounters = await getTelemetryCounters(3);
      expect(telemetryCounters).to.eql([
        {
          type: 'succeed',
          event_type: 'test-plugin-lifecycle',
          source: 'FTR-shipper',
          code: '200',
          count: 1,
        },
        {
          type: 'succeed',
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
