/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'long-window-logstash-*',
    'dateFormat:tz': 'Europe/Berlin',
  };

  describe('discover histogram', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('long_window_logstash');
      await esArchiver.load('long_window_logstash_index_pattern');
      await security.testUser.setRoles(['kibana_admin', 'long_window_logstash']);
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });
    after(async () => {
      await esArchiver.unload('long_window_logstash');
      await esArchiver.unload('long_window_logstash_index_pattern');
      await security.testUser.restoreDefaults();
    });

    async function prepareTest(fromTime: string, toTime: string, interval: string) {
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.setChartInterval(interval);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    it('should visualize monthly data with different day intervals', async () => {
      const fromTime = 'Nov 01, 2017 @ 00:00:00.000';
      const toTime = 'Mar 21, 2018 @ 00:00:00.000';
      await prepareTest(fromTime, toTime, 'Month');
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize weekly data with within DST changes', async () => {
      const fromTime = 'Mar 01, 2018 @ 00:00:00.000';
      const toTime = 'May 01, 2018 @ 00:00:00.000';
      await prepareTest(fromTime, toTime, 'Week');
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize monthly data with different years scaled to 30 days', async () => {
      const fromTime = 'Jan 01, 2010 @ 00:00:00.000';
      const toTime = 'Mar 21, 2019 @ 00:00:00.000';
      await prepareTest(fromTime, toTime, 'Day');
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
      const chartIntervalIconTip = await PageObjects.discover.getChartIntervalWarningIcon();
      expect(chartIntervalIconTip).to.be(true);
    });
  });
}
