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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const filterBar = getService('filterBar');
  const renderable = getService('renderable');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'header',
    'dashboard',
    'timePicker',
    'visEditor',
    'visChart',
  ]);

  describe('data table with index without time filter filters', function indexPatternCreation() {
    const vizName1 = 'Visualization DataTable w/o time filter';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch(
        PageObjects.visualize.index.LOGSTASH_NON_TIME_BASED
      );
      log.debug('Bucket = Split Rows');
      await PageObjects.visEditor.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visEditor.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await PageObjects.visEditor.selectField('bytes');
      log.debug('Interval = 2000');
      await PageObjects.visEditor.setInterval('2000', { type: 'numeric' });
      await PageObjects.visEditor.clickGo();
    });

    it('should be able to save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visChart.waitForVisualization();
    });

    it('timefilter should be disabled', async () => {
      const isOff = await PageObjects.timePicker.isOff();
      expect(isOff).to.be(true);
    });

    // test to cover bug #54548 - add this visualization to a dashboard and filter
    it('should add to dashboard and allow filtering', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.addVisualization(vizName1);

      // hover and click on cell to filter
      await PageObjects.visChart.filterOnTableCell('1', '2');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await renderable.waitForRender();
      const filterCount = await filterBar.getFilterCount();
      expect(filterCount).to.be(1);

      await filterBar.removeAllFilters();
    });
  });
}
