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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'long-window-logstash-*',
    'dateFormat:tz': 'Europe/Berlin',
  };

  // https://github.com/elastic/kibana/issues/63928
  describe.skip('discover histogram', function describeIndexTests() {
    before(async function() {
      log.debug('load kibana index with default index pattern');
      await PageObjects.common.navigateToApp('home');
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('long_window_logstash');
      await esArchiver.load('visualize');
      await esArchiver.load('discover');

      log.debug('create long_window_logstash index pattern');
      // NOTE: long_window_logstash load does NOT create index pattern
      await PageObjects.settings.createIndexPattern('long-window-logstash-');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await browser.refresh();

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('long-window-logstash-*');
      // NOTE: For some reason without setting this relative time, the abs times will not fetch data.
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_Last_1 year');
    });
    after(async () => {
      await esArchiver.unload('long_window_logstash');
      await esArchiver.unload('visualize');
      await esArchiver.unload('discover');
    });

    it('should visualize monthly data with different day intervals', async () => {
      //Nov 1, 2017 @ 01:00:00.000 - Mar 21, 2018 @ 02:00:00.000
      const fromTime = '2017-11-01 00:00:00.000';
      const toTime = '2018-03-21 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.setChartInterval('Monthly');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize weekly data with within DST changes', async () => {
      //Nov 1, 2017 @ 01:00:00.000 - Mar 21, 2018 @ 02:00:00.000
      const fromTime = '2018-03-01 00:00:00.000';
      const toTime = '2018-05-01 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.setChartInterval('Weekly');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize monthly data with different years Scaled to 30d', async () => {
      //Nov 1, 2017 @ 01:00:00.000 - Mar 21, 2018 @ 02:00:00.000
      const fromTime = '2010-01-01 00:00:00.000';
      const toTime = '2018-03-21 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.setChartInterval('Daily');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
  });
}
