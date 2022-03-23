/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['visualize', 'visEditor', 'visChart', 'timePicker']);

  describe('gauge chart', function indexPatternCreation() {
    before(async () => {
      await PageObjects.visualize.initTests();
    });
    async function initGaugeVis() {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickGauge');
      await PageObjects.visualize.clickGauge();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    }

    before(initGaugeVis);

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show Count', function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      return retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visChart.getGaugeValue();
        expect(expectedCount).to.eql(metricValue);
      });
    });

    it('should format the metric correctly in percentage mode', async function () {
      await PageObjects.visEditor.clickMetricEditor();
      await PageObjects.visEditor.selectAggregation('Average', 'metrics');
      await PageObjects.visEditor.selectField('bytes', 'metrics');
      await PageObjects.visEditor.clickOptionsTab();
      await testSubjects.setValue('gaugeColorRange2__to', '10000');
      await testSubjects.click('gaugePercentageMode');
      await testSubjects.setValue('gaugePercentageModeFormatPattern', '0.0%');
      await PageObjects.visChart.waitForVisualizationRenderingStabilized();
      await PageObjects.visEditor.clickGo();

      await retry.try(async function tryingForTime() {
        const expectedTexts = ['57.3%', 'Average bytes'];
        const metricValue = await PageObjects.visChart.getGaugeValue();
        expect(expectedTexts).to.eql(metricValue);
      });
    });

    describe('Split Gauges', () => {
      before(async () => {
        await initGaugeVis();
        log.debug('Bucket = Split Group');
        await PageObjects.visEditor.clickBucket('Split group');
        log.debug('Aggregation = Terms');
        await PageObjects.visEditor.selectAggregation('Terms');
        log.debug('Field = machine.os.raw');
        await PageObjects.visEditor.selectField('machine.os.raw');
        log.debug('Size = 4');
        await PageObjects.visEditor.setSize(4);
        await PageObjects.visEditor.clickGo();
      });

      it('should show Split Gauges', async () => {
        await retry.try(async () => {
          expect(await PageObjects.visChart.getGaugeValue()).to.eql([
            '2,904',
            'win 8',
            '2,858',
            'win xp',
            '2,814',
            'win 7',
            '2,784',
            'ios',
          ]);
        });
      });

      it('should add machine.os.raw:win 8 filter by click on the first Gauge', async () => {
        await PageObjects.visChart.clickOnGaugeByLabel('win 8');
        const hasFilter = await filterBar.hasFilter('machine.os.raw', 'win 8');

        expect(hasFilter).to.eql(true);
      });

      it('should show correct values for fields with fieldFormatters', async () => {
        await filterBar.removeAllFilters();
        const expectedTexts = ['2,904', 'win 8: Count', '0B', 'win 8: Min bytes'];

        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('machine.os.raw');
        await PageObjects.visEditor.setSize(1);
        await PageObjects.visEditor.clickBucket('Metric', 'metrics');
        await PageObjects.visEditor.selectAggregation('Min', 'metrics');
        await PageObjects.visEditor.selectField('bytes', 'metrics');
        await PageObjects.visEditor.clickGo();

        await retry.try(async function tryingForTime() {
          const metricValue = await PageObjects.visChart.getGaugeValue();
          expect(expectedTexts).to.eql(metricValue);
        });
      });
    });
  });
}
