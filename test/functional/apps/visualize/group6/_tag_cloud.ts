/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const log = getService('log');
  const inspector = getService('inspector');
  const browser = getService('browser');
  const retry = getService('retry');
  const find = getService('find');
  const { common, visualize, visEditor, visChart, header, settings, timePicker, tagCloud } =
    getPageObjects([
      'common',
      'visualize',
      'visEditor',
      'visChart',
      'header',
      'settings',
      'timePicker',
      'tagCloud',
    ]);

  describe('tag cloud chart', function () {
    const vizName1 = 'Visualization tagCloud';
    const termsField = 'machine.ram';

    before(async function () {
      await visualize.initTests();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      log.debug('navigateToApp visualize');
      await visualize.navigateToNewAggBasedVisualization();
      log.debug('clickTagCloud');
      await visualize.clickTagCloud();
      await visualize.clickNewSearch();
      log.debug('select Tags');
      await visEditor.clickBucket('Tags');
      log.debug('Click aggregation Terms');
      await visEditor.selectAggregation('Terms');
      log.debug('Click field machine.ram');
      await retry.try(async function tryingForTime() {
        await visEditor.selectField(termsField);
      });
      await visEditor.selectOrderByMetric(2, '_key');
      await visEditor.clickGo();
    });

    after(async () => {
      await common.unsetTime();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct tag cloud data', async function () {
      await visChart.waitForVisualization();
      const data = await tagCloud.getTextTag();
      log.debug(data);
      expect(data).to.eql([
        '32,212,254,720',
        '21,474,836,480',
        '19,327,352,832',
        '20,401,094,656',
        '18,253,611,008',
      ]);
    });

    it('should collapse the sidebar', async function () {
      const editorSidebar = await find.byCssSelector('.visEditorSidebar');
      await visEditor.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await common.sleep(1000);
      const isDisplayed = await editorSidebar.isDisplayed();
      expect(isDisplayed).to.be(false);
      await visEditor.clickEditorSidebarCollapse();
    });

    it('should still show all tags after sidebar has been collapsed', async function () {
      await visEditor.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await common.sleep(1000);
      await visEditor.clickEditorSidebarCollapse();
      // Give d3 tag cloud some time to rearrange tags
      await common.sleep(1000);
      await visChart.waitForVisualization();
      const data = await tagCloud.getTextTag();
      log.debug(data);
      expect(data).to.eql([
        '32,212,254,720',
        '21,474,836,480',
        '19,327,352,832',
        '20,401,094,656',
        '18,253,611,008',
      ]);
    });

    it('should still show all tags after browser was resized very small', async function () {
      await browser.setWindowSize(200, 200);
      await common.sleep(1000);
      await browser.setWindowSize(1200, 800);
      await common.sleep(1000);
      await visChart.waitForVisualization();
      const data = await tagCloud.getTextTag();
      expect(data).to.eql([
        '32,212,254,720',
        '21,474,836,480',
        '19,327,352,832',
        '20,401,094,656',
        '18,253,611,008',
      ]);
    });

    it('should save and load', async function () {
      await visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await visualize.loadSavedVisualization(vizName1);
      await visChart.waitForVisualization();
    });

    it('should show the tags and relative size', function () {
      return tagCloud.getTextSizes().then(function (results) {
        log.debug('results here ' + results);
        expect(results).to.eql(['72px', '63px', '32px', '25px', '18px']);
      });
    });

    it('should show correct data', async function () {
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

    describe('formatted field', function () {
      before(async function () {
        await settings.navigateTo();
        await settings.clickKibanaIndexPatterns();
        await settings.clickIndexPatternLogstash();
        await settings.openControlsByName(termsField);
        await (
          await (
            await testSubjects.find('formatRow')
          ).findAllByCssSelector('[data-test-subj="toggle"]')
        )[0].click();
        await settings.setFieldFormat('bytes');
        await settings.controlChangeSave();
        await common.navigateToApp('visualize');
        await visualize.loadSavedVisualization(vizName1, {
          navigateToVisualize: false,
        });
        await header.waitUntilLoadingHasFinished();
        await visChart.waitForVisualization();
      });

      after(async function () {
        await filterBar.removeFilter(termsField);
        await settings.navigateTo();
        await settings.clickKibanaIndexPatterns();
        await settings.clickIndexPatternLogstash();
        await settings.openControlsByName(termsField);
        await settings.setFieldFormat('');
        await settings.controlChangeSave();
      });

      it('should format tags with field formatter', async function () {
        await visChart.waitForVisualization();
        const data = await tagCloud.getTextTag();
        log.debug(data);
        expect(data).to.eql(['30GB', '20GB', '18GB', '19GB', '17GB']);
      });

      it('should apply filter with unformatted value', async function () {
        await tagCloud.selectTagCloudTag('30GB');
        await header.waitUntilLoadingHasFinished();
        await visChart.waitForVisualization();
        const data = await tagCloud.getTextTag();
        expect(data).to.eql(['30GB']);
      });
    });
  });
}
