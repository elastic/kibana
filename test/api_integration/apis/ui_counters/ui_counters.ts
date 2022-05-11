/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { ReportManager, METRIC_TYPE, UiCounterMetricType, Report } from '@kbn/analytics';
import moment from 'moment';
import { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

  const createUiCounterEvent = (eventName: string, type: UiCounterMetricType, count = 1) => ({
    eventName,
    appName: 'myApp',
    type,
    count,
  });

  const fetchUsageCountersObjects = async (): Promise<UsageCountersSavedObject[]> => {
    const {
      body: { saved_objects: savedObjects },
    } = await supertest
      .get('/api/saved_objects/_find?type=usage-counters')
      .set('kbn-xsrf', 'kibana')
      .expect(200);

    return savedObjects;
  };

  const sendReport = async (report: Report): Promise<void> => {
    await supertest
      .post('/api/ui_counters/_report')
      .set('kbn-xsrf', 'kibana')
      .set('content-type', 'application/json')
      .send({ report })
      .expect(200);
  };

  const getCounterById = (
    savedObjects: UsageCountersSavedObject[],
    targetId: string
  ): UsageCountersSavedObject => {
    const savedObject = savedObjects.find(({ id }: { id: string }) => id === targetId);
    if (!savedObject) {
      throw new Error(`Unable to find savedObject id ${targetId}`);
    }

    return savedObject;
  };

  // FLAKY: https://github.com/elastic/kibana/issues/98240
  describe.skip('UI Counters API', () => {
    const dayDate = moment().format('DDMMYYYY');
    before(async () => await esArchiver.emptyKibanaIndex());

    it('stores ui counter events in usage counters savedObjects', async () => {
      const reportManager = new ReportManager();

      const { report } = reportManager.assignReports([
        createUiCounterEvent('my_event', METRIC_TYPE.COUNT),
      ]);

      await sendReport(report);

      await retry.waitForWithTimeout('reported events to be stored into ES', 8000, async () => {
        const savedObjects = await fetchUsageCountersObjects();
        const countTypeEvent = getCounterById(
          savedObjects,
          `uiCounter:${dayDate}:${METRIC_TYPE.COUNT}:myApp:my_event`
        );
        expect(countTypeEvent.attributes.count).to.eql(1);
        return true;
      });
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

      await sendReport(report);
      await retry.waitForWithTimeout('reported events to be stored into ES', 8000, async () => {
        const savedObjects = await fetchUsageCountersObjects();
        const countTypeEvent = getCounterById(
          savedObjects,
          `uiCounter:${dayDate}:${METRIC_TYPE.COUNT}:myApp:${uniqueEventName}`
        );
        expect(countTypeEvent.attributes.count).to.eql(1);

        const clickTypeEvent = getCounterById(
          savedObjects,
          `uiCounter:${dayDate}:${METRIC_TYPE.CLICK}:myApp:${uniqueEventName}`
        );
        expect(clickTypeEvent.attributes.count).to.eql(2);

        const secondEvent = getCounterById(
          savedObjects,
          `uiCounter:${dayDate}:${METRIC_TYPE.COUNT}:myApp:${uniqueEventName}_2`
        );
        expect(secondEvent.attributes.count).to.eql(1);
        return true;
      });
    });
  });
}
