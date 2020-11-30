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
import moment from 'moment';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const createUiCounterEvent = (eventName, type, count = 1) => ({
    eventName,
    appName: 'myApp',
    type,
    count,
  });

  describe('UI Counters API', () => {
    const dayDate = moment().format('DDMMYYYY');

    it('stores ui counter events in savedObjects', async () => {
      const reportManager = new ReportManager();

      const { report } = reportManager.assignReports([
        createUiCounterEvent('my_event', METRIC_TYPE.COUNT),
      ]);

      await supertest
        .post('/api/ui_counters/_report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const response = await es.search({ index: '.kibana', q: 'type:ui-counter' });

      const ids = response.hits.hits.map(({ _id }) => _id);
      expect(ids.includes(`ui-counter:myApp:${dayDate}:${METRIC_TYPE.COUNT}:my_event`)).to.eql(
        true
      );
    });

    it('supports multiple events', async () => {
      const reportManager = new ReportManager();
      const hrTime = process.hrtime();
      const nano = hrTime[0] * 1000000000 + hrTime[1];
      const uniqueEventName = `my_event_${nano}`;
      const { report } = reportManager.assignReports([
        createUiCounterEvent(uniqueEventName, METRIC_TYPE.COUNT),
        createUiCounterEvent(`${uniqueEventName}_2`, METRIC_TYPE.COUNT),
        createUiCounterEvent(uniqueEventName, METRIC_TYPE.CLICK, 2),
      ]);
      await supertest
        .post('/api/ui_counters/_report')
        .set('kbn-xsrf', 'kibana')
        .set('content-type', 'application/json')
        .send({ report })
        .expect(200);

      const {
        hits: { hits },
      } = await es.search({ index: '.kibana', q: 'type:ui-counter' });

      const countTypeEvent = hits.find(
        (hit) => hit._id === `ui-counter:myApp:${dayDate}:${METRIC_TYPE.COUNT}:${uniqueEventName}`
      );
      expect(countTypeEvent._source['ui-counter'].count).to.eql(1);

      const clickTypeEvent = hits.find(
        (hit) => hit._id === `ui-counter:myApp:${dayDate}:${METRIC_TYPE.CLICK}:${uniqueEventName}`
      );
      expect(clickTypeEvent._source['ui-counter'].count).to.eql(2);

      const secondEvent = hits.find(
        (hit) => hit._id === `ui-counter:myApp:${dayDate}:${METRIC_TYPE.COUNT}:${uniqueEventName}_2`
      );
      expect(secondEvent._source['ui-counter'].count).to.eql(1);
    });
  });
}
