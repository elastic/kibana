/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { TelemetryCounter } from 'src/core/server';
import { FtrProviderContext } from '../services/types';
import { Action } from '../__fixtures__/plugins/analytics_plugin_a/server/custom_shipper';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

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

  describe('analytics service', () => {
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
      await supertest
        .post(`/internal/analytics_plugin_a/opt_in`)
        .set('kbn-xsrf', 'xxx')
        .query({ consent: true })
        .expect(200);

      const actions = await getActions(3);
      // Treating the PID as remote because the tests may run the server in a separate process to the suites
      const remotePID = actions[1].meta.pid;
      expect(actions).to.eql([
        { action: 'optIn', meta: true },
        { action: 'extendContext', meta: { pid: remotePID } },
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
              context: { pid: remotePID },
              properties: { plugin: 'analyticsPluginA', step: 'start' },
            },
          ],
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
