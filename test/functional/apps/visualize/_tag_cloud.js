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
  const filterBar = getService('filterBar');
  const log = getService('log');
  const remote = getService('remote');
  const retry = getService('retry');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('tag cloud chart', function () {
    const vizName1 = 'Visualization tagCloud';
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    const termsField = 'machine.ram';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickTagCloud');
      await PageObjects.visualize.clickTagCloud();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('select Tags');
      await PageObjects.visualize.clickBucket('Tags');
      log.debug('Click aggregation Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Click field machine.ram');
      await retry.try(async function tryingForTime() {
        await PageObjects.visualize.selectField(termsField);
      });
      await PageObjects.visualize.selectOrderBy('_key');
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });


    it('should have inspector enabled', async function () {
      const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
      expect(spyToggleExists).to.be(true);
    });

    it('should show correct tag cloud data', async function () {
      const data = await PageObjects.visualize.getTextTag();
      log.debug(data);
      expect(data).to.eql([ '32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008' ]);
    });

    it('should collapse the sidebar', async function () {
      const editorSidebar = await find.byCssSelector('.collapsible-sidebar');
      await PageObjects.visualize.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await PageObjects.common.sleep(1000);
      const afterSize = await editorSidebar.getSize();
      expect(afterSize.width).to.be(0);
      await PageObjects.visualize.clickEditorSidebarCollapse();
    });


    it('should still show all tags after sidebar has been collapsed', async function () {
      await PageObjects.visualize.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await PageObjects.common.sleep(1000);
      await PageObjects.visualize.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await PageObjects.common.sleep(1000);
      const data = await PageObjects.visualize.getTextTag();
      log.debug(data);
      expect(data).to.eql(['32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008']);
    });

    it('should still show all tags after browser was resized very small', async function () {
      await remote.setWindowSize(200, 200);
      await PageObjects.common.sleep(1000);
      await remote.setWindowSize(1200, 800);
      await PageObjects.common.sleep(1000);
      const data = await PageObjects.visualize.getTextTag();
      expect(data).to.eql([ '32,212,254,720', '21,474,836,480', '20,401,094,656', '19,327,352,832', '18,253,611,008' ]);
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.visualize.waitForVisualizationSavedToastGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });



    it('should show the tags and relative size', function () {
      return PageObjects.visualize.getTextSizes()
        .then(function (results) {
          log.debug('results here ' + results);
          expect(results).to.eql(['72px', '63px', '25px', '32px',  '18px' ]);
        });
    });


    it('should show correct data', async function () {
      const expectedTableData =  [
        [ '32,212,254,720', '737' ],
        [ '21,474,836,480', '728' ],
        [ '20,401,094,656', '687' ],
        [ '19,327,352,832', '695' ],
        [ '18,253,611,008', '679' ]
      ];

      await PageObjects.visualize.openInspector();
      await await PageObjects.visualize.setInspectorTablePageSize('50');
      const data = await PageObjects.visualize.getInspectorTableData();
      log.debug(data);
      expect(data).to.eql(expectedTableData);
    });

    describe('formatted field', function () {
      before(async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
        await PageObjects.settings.filterField(termsField);
        await PageObjects.settings.openControlsByName(termsField);
        await PageObjects.settings.setFieldFormat('bytes');
        await PageObjects.settings.controlChangeSave();
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
      });

      after(async function () {
        await filterBar.removeFilter(termsField);
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
        await PageObjects.settings.filterField(termsField);
        await PageObjects.settings.openControlsByName(termsField);
        await PageObjects.settings.setFieldFormat('');
        await PageObjects.settings.controlChangeSave();
      });

      it('should format tags with field formatter', async function () {
        const data = await PageObjects.visualize.getTextTag();
        log.debug(data);
        expect(data).to.eql([ '30GB', '20GB', '19GB', '18GB', '17GB' ]);
      });

      it('should apply filter with unformatted value', async function () {
        await PageObjects.visualize.selectTagCloudTag('30GB');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const data = await PageObjects.visualize.getTextTag();
        expect(data).to.eql([ '30GB' ]);
      });

    });

  });
}
