/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ReportManager, METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { SavedObject } from '../../../../src/core/server';
import { UICounterSavedObjectAttributes } from '../../../../src/plugins/kibana_usage_collection/server/collectors/ui_counters/ui_counter_saved_object_type';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const createUiCounterEvent = (eventName: string, type: UiCounterMetricType, count = 1) => ({
    eventName,
    appName: 'myApp',
    type,
    count,
  });

  const getCounterById = (
    savedObjects: Array<SavedObject<UICounterSavedObjectAttributes>>,
    targetId: string
  ): SavedObject<UICounterSavedObjectAttributes> => {
    const savedObject = savedObjects.find(({ id }: { id: string }) => id === targetId);
    if (!savedObject) {
      throw new Error(`Unable to find savedObject id ${targetId}`);
    }

    return savedObject;
  };

  describe('UI Counters API', () => {
    const dayDate = moment().format('DDMMYYYY');
    before(async () => await esArchiver.emptyKibanaIndex());

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

      const {
        body: { saved_objects: savedObjects },
      } = await supertest
        .get('/api/saved_objects/_find?type=ui-counter')
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      const countTypeEvent = getCounterById(
        savedObjects,
        `myApp:${dayDate}:${METRIC_TYPE.COUNT}:my_event`
      );
      expect(countTypeEvent.attributes.count).to.eql(1);
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
        body: { saved_objects: savedObjects },
      } = await supertest
        .get('/api/saved_objects/_find?type=ui-counter&fields=count')
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      const countTypeEvent = getCounterById(
        savedObjects,
        `myApp:${dayDate}:${METRIC_TYPE.COUNT}:${uniqueEventName}`
      );
      expect(countTypeEvent.attributes.count).to.eql(1);

      const clickTypeEvent = getCounterById(
        savedObjects,
        `myApp:${dayDate}:${METRIC_TYPE.CLICK}:${uniqueEventName}`
      );
      expect(clickTypeEvent.attributes.count).to.eql(2);

      const secondEvent = getCounterById(
        savedObjects,
        `myApp:${dayDate}:${METRIC_TYPE.COUNT}:${uniqueEventName}_2`
      );
      expect(secondEvent.attributes.count).to.eql(1);
    });
  });
}
