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
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickDataTable');
          return PageObjects.visualize.clickDataTable();
        })
        .then(function clickNewSearch() {
          log.debug('clickNewSearch');
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          log.debug('Bucket = Split Rows');
          return PageObjects.visualize.clickBucket('Split Rows');
        })
        .then(function selectAggregation() {
          log.debug('Aggregation = Histogram');
          return PageObjects.visualize.selectAggregation('Histogram');
        })
        .then(function selectField() {
          log.debug('Field = bytes');
          return PageObjects.visualize.selectField('bytes');
        })
        .then(function setInterval() {
          log.debug('Interval = 2000');
          return PageObjects.visualize.setNumericInterval('2000');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });

    describe('data table', function indexPatternCreation() {
      const vizName1 = 'Visualization DataTable';

      it('should be able to save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
          .then(() => {
            return PageObjects.common.getBreadcrumbPageTitle();
          })
          .then(pageTitle => {
            log.debug(`Save viz page title is ${pageTitle}`);
            expect(pageTitle).to.contain(vizName1);
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
          })
          .then(function () {
            return PageObjects.visualize.loadSavedVisualization(vizName1);
          })
          .then(function () {
            return PageObjects.visualize.waitForVisualization();
          });
      });

      it('should have inspector enabled', async function () {
        const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
        expect(spyToggleExists).to.be(true);
      });

      it('should show correct data, take screenshot', function () {
        const expectedChartData = [
          '0B', '2,088', '1.953KB', '2,748', '3.906KB', '2,707', '5.859KB', '2,876', '7.813KB',
          '2,863', '9.766KB', '147', '11.719KB', '148', '13.672KB', '129', '15.625KB', '161', '17.578KB', '137'
        ];

        return retry.try(function () {
          return PageObjects.visualize.getTableVisData()
            .then(function showData(data) {
              log.debug(data.split('\n'));
              expect(data.split('\n')).to.eql(expectedChartData);
            });
        });
      });

      it('should show correct data for a data table with date histogram', async () => {
        await PageObjects.common.navigateToUrl('visualize', 'new');
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.clickBucket('Split Rows');
        await PageObjects.visualize.selectAggregation('Date Histogram');
        await PageObjects.visualize.selectField('@timestamp');
        await PageObjects.visualize.setInterval('Daily');
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const data = await PageObjects.visualize.getTableVisData();
        expect(data.trim().split('\n')).to.be.eql([
          '2015-09-20', '4,757',
          '2015-09-21', '4,614',
          '2015-09-22', '4,633',
        ]);
      });

      it('should correctly filter for applied time filter on the main timefield', async () => {
        await filterBar.addFilter('@timestamp', 'is between', ['2015-09-19', '2015-09-21']);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const data = await PageObjects.visualize.getTableVisData();
        expect(data.trim().split('\n')).to.be.eql([
          '2015-09-20', '4,757',
        ]);
      });

    });
  });
}
