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
  const filterBar = getService('filterBar');
  const log = getService('log');
  const inspector = getService('inspector');
  const browser = getService('browser');
  const retry = getService('retry');
  const find = getService('find');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'header',
    'settings',
    'timePicker',
    'tagCloud',
  ]);

  describe('tag cloud chart', function() {
    const vizName1 = 'Visualization tagCloud';
    const termsField = 'machine.ram';

    before(async function() {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickTagCloud');
      await PageObjects.visualize.clickTagCloud();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('select Tags');
      await PageObjects.visEditor.clickBucket('Tags');
      log.debug('Click aggregation Terms');
      await PageObjects.visEditor.selectAggregation('Terms');
      log.debug('Click field machine.ram');
      await retry.try(async function tryingForTime() {
        await PageObjects.visEditor.selectField(termsField);
      });
      await PageObjects.visEditor.selectOrderByMetric(2, '_key');
      await PageObjects.visEditor.clickGo();
    });

    it('should have inspector enabled', async function() {
      await inspector.expectIsEnabled();
    });

    it('should show correct tag cloud data', async function() {
      const data = await PageObjects.tagCloud.getTextTag();
      log.debug(data);
      expect(data).to.eql([
        '32,212,254,720',
        '21,474,836,480',
        '20,401,094,656',
        '19,327,352,832',
        '18,253,611,008',
      ]);
    });

    it('should collapse the sidebar', async function() {
      const editorSidebar = await find.byCssSelector('.collapsible-sidebar');
      await PageObjects.visEditor.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await PageObjects.common.sleep(1000);
      const afterSize = await editorSidebar.getSize();
      expect(afterSize.width).to.be(0);
      await PageObjects.visEditor.clickEditorSidebarCollapse();
    });

    it('should still show all tags after sidebar has been collapsed', async function() {
      await PageObjects.visEditor.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await PageObjects.common.sleep(1000);
      await PageObjects.visEditor.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await PageObjects.common.sleep(1000);
      const data = await PageObjects.tagCloud.getTextTag();
      log.debug(data);
      expect(data).to.eql([
        '32,212,254,720',
        '21,474,836,480',
        '20,401,094,656',
        '19,327,352,832',
        '18,253,611,008',
      ]);
    });

    it('should still show all tags after browser was resized very small', async function() {
      await browser.setWindowSize(200, 200);
      await PageObjects.common.sleep(1000);
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.sleep(1000);
      const data = await PageObjects.tagCloud.getTextTag();
      expect(data).to.eql([
        '32,212,254,720',
        '21,474,836,480',
        '20,401,094,656',
        '19,327,352,832',
        '18,253,611,008',
      ]);
    });

    it('should save and load', async function() {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visChart.waitForVisualization();
    });

    it('should show the tags and relative size', function() {
      return PageObjects.visualize.getTextSizes().then(function(results) {
        log.debug('results here ' + results);
        expect(results).to.eql(['72px', '63px', '25px', '32px', '18px']);
      });
    });

    it('should show correct data', async function() {
      const expectedTableData = [
        ['32,212,254,720', '737'],
        ['21,474,836,480', '728'],
        ['20,401,094,656', '687'],
        ['19,327,352,832', '695'],
        ['18,253,611,008', '679'],
      ];

      await inspector.open();
      await await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    });

    describe('formatted field', function() {
      before(async function() {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.filterField(termsField);
        await PageObjects.settings.openControlsByName(termsField);
        await PageObjects.settings.setFieldFormat('bytes');
        await PageObjects.settings.controlChangeSave();
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.visualize.loadSavedVisualization(vizName1, {
          navigateToVisualize: false,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visChart.waitForVisualization();
      });

      after(async function() {
        await filterBar.removeFilter(termsField);
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.filterField(termsField);
        await PageObjects.settings.openControlsByName(termsField);
        await PageObjects.settings.setFieldFormat('');
        await PageObjects.settings.controlChangeSave();
      });

      it('should format tags with field formatter', async function() {
        const data = await PageObjects.tagCloud.getTextTag();
        log.debug(data);
        expect(data).to.eql(['30GB', '20GB', '19GB', '18GB', '17GB']);
      });

      it('should apply filter with unformatted value', async function() {
        await PageObjects.tagCloud.selectTagCloudTag('30GB');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const data = await PageObjects.tagCloud.getTextTag();
        expect(data).to.eql(['30GB']);
      });
    });
  });
}
