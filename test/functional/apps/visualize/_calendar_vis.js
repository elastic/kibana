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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('visualize app',  () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickCalendar');
      await PageObjects.visualize.clickCalendarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
    });

    describe('calendar chart', () => {
      const vizName = 'Visualization CalendarChart';

      it('should save and load', async () => {
        await PageObjects.visualize.saveVisualization(vizName);
        const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
        log.debug(`Save viz page title is ${pageTitle}`);
        expect(pageTitle).to.contain(vizName);
        await PageObjects.header.waitForToastMessageGone();
        await PageObjects.visualize.loadSavedVisualization(vizName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
      });

      it('should have inspector enabled', async () => {
        const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
        expect(spyToggleExists).to.be(true);
      });

      it('should show correct data', async () => {
        // this is only the first page of the tabular data.
        const expectedChartData = [
          ['2015-09-20', '2015', '4,757'],
          ['2015-09-21', '2015', '4,614'],
          ['2015-09-22', '2015', '4,633']
        ];

        await PageObjects.visualize.openInspector();
        const data = await PageObjects.visualize.getInspectorTableData();
        log.debug(data);
        expect(data).to.eql(expectedChartData);
      });
    });

  });
}
