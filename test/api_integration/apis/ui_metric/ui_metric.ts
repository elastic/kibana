/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ReportManager, METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { UserAgentMetric } from '@kbn/analytics/target_types/metrics/user_agent';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const createStatsMetric = (
    eventName: string,
    type: UiCounterMetricType = METRIC_TYPE.CLICK,
    count = 1
  ) => ({
    eventName,
    appName: 'myApp',
    type,
    count,
  });

  const createUserAgentMetric = (appName: string): UserAgentMetric => ({
    appName,
    type: METRIC_TYPE.USER_AGENT,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36',
  });

  describe('ui_metric savedObject data', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
    });

    it('increments the count field in the document defined by the {app}/{action_type} path', async () => {
      const reportManager = new ReportManager();
      const uiStatsMetric = createStatsMetric('myEvent');
      const { report } = reportManager.assignReports([uiStatsMetric]);
      await supertest
        .post('/api/ui_counters/_report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const response = await es.search({ index: '.kibana', q: 'type:ui-metric' });
      const ids = response.hits.hits.map(({ _id }: { _id: string }) => _id);
      expect(ids.includes('ui-metric:myApp:myEvent')).to.eql(true);
    });

    it('supports multiple events', async () => {
      const reportManager = new ReportManager();
      const userAgentMetric = createUserAgentMetric('kibana');
      const uiStatsMetric1 = createStatsMetric('myEvent');
      const hrTime = process.hrtime();
      const nano = hrTime[0] * 1000000000 + hrTime[1];
      const uniqueEventName = `myEvent${nano}`;
      const uiStatsMetric2 = createStatsMetric(uniqueEventName);
      const { report } = reportManager.assignReports([
        userAgentMetric,
        uiStatsMetric1,
        uiStatsMetric2,
      ]);
      await supertest
        .post('/api/ui_counters/_report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const response = await es.search({ index: '.kibana', q: 'type:ui-metric' });
      const ids = response.hits.hits.map(({ _id }: { _id: string }) => _id);
      expect(ids.includes('ui-metric:myApp:myEvent')).to.eql(true);
      expect(ids.includes(`ui-metric:myApp:${uniqueEventName}`)).to.eql(true);
      expect(ids.includes(`ui-metric:kibana-user_agent:${userAgentMetric.userAgent}`)).to.eql(true);
    });

    it('aggregates multiple events with same eventID', async () => {
      const reportManager = new ReportManager();
      const hrTime = process.hrtime();
      const nano = hrTime[0] * 1000000000 + hrTime[1];
      const uniqueEventName = `my_event_${nano}`;
      const { report } = reportManager.assignReports([
        createStatsMetric(uniqueEventName, METRIC_TYPE.CLICK, 2),
        createStatsMetric(uniqueEventName, METRIC_TYPE.LOADED),
      ]);
      await supertest
        .post('/api/ui_counters/_report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const {
        hits: { hits },
      } = await es.search<any>({ index: '.kibana', q: 'type:ui-metric' });

      const countTypeEvent = hits.find(
        (hit: { _id: string }) => hit._id === `ui-metric:myApp:${uniqueEventName}`
      );
      expect(countTypeEvent?._source['ui-metric'].count).to.eql(3);
    });
  });
}
