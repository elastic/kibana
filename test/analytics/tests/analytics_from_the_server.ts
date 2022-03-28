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

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ebtServerHelper = getService('kibana_ebt_server');

  const getTelemetryCounters = async (
    takeNumberOfCounters: number
  ): Promise<TelemetryCounter[]> => {
    const resp = await supertest
      .get(`/internal/analytics_plugin_a/stats`)
      .query({ takeNumberOfCounters })
      .set('kbn-xsrf', 'xxx')
      .expect(200);

    return resp.body;
  };

  const getActions = async (takeNumberOfActions: number): Promise<Action[]> => {
    const resp = await supertest
      .get(`/internal/analytics_plugin_a/actions`)
      .query({ takeNumberOfActions })
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

    it('after setting opt-in, it should extend the contexts and send the events', async () => {
      await ebtServerHelper.setOptIn(true);

      const actions = await getActions(3);
      // Validating the remote PID because that's the only field that it's added by the FTR plugin.
      const context = actions[1].meta;
      expect(context).to.have.property('pid');
      expect(context.pid).to.be.a('number');

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
              context,
              properties: { plugin: 'analyticsPluginA', step: 'start' },
            },
          ],
        },
      ]);

      // This helps us to also test the helpers
      const events = await ebtServerHelper.getLastEvents(2, ['test-plugin-lifecycle']);
      expect(events).to.eql([
        {
          timestamp: actions[2].meta[0].timestamp,
          event_type: 'test-plugin-lifecycle',
          context: {},
          properties: { plugin: 'analyticsPluginA', step: 'setup' },
        },
        {
          timestamp: actions[2].meta[1].timestamp,
          event_type: 'test-plugin-lifecycle',
          context,
          properties: { plugin: 'analyticsPluginA', step: 'start' },
        },
      ]);

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
