/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { ReportManager, METRIC_TYPE } from '@kbn/analytics';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const createStatsMetric = (eventName) => ({
    key: ReportManager.createMetricKey({ appName: 'myApp', type: METRIC_TYPE.CLICK, eventName }),
    eventName,
    appName: 'myApp',
    type: METRIC_TYPE.CLICK,
    stats: { sum: 1, avg: 1, min: 1, max: 1 },
  });

  const createUserAgentMetric = (appName) => ({
    key: ReportManager.createMetricKey({ appName, type: METRIC_TYPE.USER_AGENT }),
    appName,
    type: METRIC_TYPE.USER_AGENT,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36',
  });

  describe('ui_metric API', () => {

    it('increments the count field in the document defined by the {app}/{action_type} path', async () => {
      const uiStatsMetric = createStatsMetric('myEvent');
      const report = {
        uiStatsMetrics: {
          [uiStatsMetric.key]: uiStatsMetric,
        }
      };
      await supertest
        .post('/api/ui_metric/report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const response = await es.search({ index: '.kibana', q: 'type:ui-metric' });
      const ids = response.hits.hits.map(({ _id }) => _id);
      expect(ids.includes('ui-metric:myApp:myEvent')).to.eql(true);
    });

    it('supports multiple events', async () => {
      const userAgentMetric = createUserAgentMetric('kibana');
      const uiStatsMetric1 = createStatsMetric('myEvent');
      const hrTime = process.hrtime();
      const nano = hrTime[0] * 1000000000 + hrTime[1];
      const uniqueEventName = `myEvent${nano}`;
      const uiStatsMetric2 = createStatsMetric(uniqueEventName);
      const report = {
        userAgent: {
          [userAgentMetric.key]: userAgentMetric,
        },
        uiStatsMetrics: {
          [uiStatsMetric1.key]: uiStatsMetric1,
          [uiStatsMetric2.key]: uiStatsMetric2,
        }
      };
      await supertest
        .post('/api/ui_metric/report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const response = await es.search({ index: '.kibana', q: 'type:ui-metric' });
      const ids = response.hits.hits.map(({ _id }) => _id);
      expect(ids.includes('ui-metric:myApp:myEvent')).to.eql(true);
      expect(ids.includes(`ui-metric:myApp:${uniqueEventName}`)).to.eql(true);
      expect(ids.includes(`ui-metric:kibana-user_agent:${userAgentMetric.userAgent}`)).to.eql(true);
    });
  });
}

