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
import { ReportManager } from '@kbn/analytics';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const createMetric = (eventName) => ({
    key: ReportManager.createMetricKey({ appName: 'myApp', type: 'click', eventName }),
    eventName,
    appName: 'myApp',
    type: 'click',
    stats: { sum: 1, avg: 1, min: 1, max: 1 },
  });

  describe('ui_metric API', () => {
    const uiStatsMetric = createMetric('myEvent');
    const report = {
      uiStatsMetrics: {
        [uiStatsMetric.key]: uiStatsMetric,
      }
    };
    it('increments the count field in the document defined by the {app}/{action_type} path', async () => {
      await supertest
        .post('/api/telemetry/report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      return es.search({
        index: '.kibana',
        q: 'type:user-action',
      }).then(response => {
        const ids = response.hits.hits.map(({ _id }) => _id);
        expect(ids.includes('user-action:myApp:myEvent'));
      });
    });

    it('supports multiple events', async () => {
      const uiStatsMetric1 = createMetric('myEvent1');
      const uiStatsMetric2 = createMetric('myEvent2');
      const report = {
        uiStatsMetrics: {
          [uiStatsMetric1.key]: uiStatsMetric1,
          [uiStatsMetric2.key]: uiStatsMetric2,
        }
      };
      await supertest
        .post('/api/telemetry/report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      return es.search({
        index: '.kibana',
        q: 'type:user-action',
      }).then(response => {
        const ids = response.hits.hits.map(({ _id }) => _id);
        expect(ids.includes('user-action:myApp:myEvent1'));
        expect(ids.includes('user-action:myApp:myEvent2'));
      });
    });
  });
}

