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
  const browser = getService('browser');
  const log = getService('log');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const security = getService('security');

  const { timePicker, visChart, visualBuilder, visualize } = getPageObjects([
    'timePicker',
    'visChart',
    'visualBuilder',
    'visualize',
  ]);

  describe('visual builder', function describeIndexTests() {
    this.tags('includeFirefox');

    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await security.testUser.setRoles(
        ['kibana_admin', 'test_logstash_reader', 'kibana_sample_admin'],
        false
      );
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
      await visualBuilder.resetPage();
    });

    describe('metric', () => {
      beforeEach(async () => {
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('metric');
      });

      it('should not have inspector enabled', async () => {
        await inspector.expectIsNotEnabled();
      });

      it('should show correct data', async () => {
        const value = await visualBuilder.getMetricValue();
        expect(value).to.eql('156');
      });

      it('should show correct data with Math Aggregation', async () => {
        await visualBuilder.createNewAgg();
        await visualBuilder.selectAggType('math', 1);
        await visualBuilder.fillInVariable();
        await visualBuilder.fillInExpression('params.test + 1');
        const value = await visualBuilder.getMetricValue();
        expect(value).to.eql('157');
      });

      it('should populate fields for basic functions', async () => {
        await visualBuilder.selectAggType('Average');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();

        expect(isFieldForAggregationValid).to.be(true);
      });

      it('should show correct data for Value Count with Entire time range mode', async () => {
        await visualBuilder.selectAggType('Value Count');
        await visualBuilder.setFieldForAggregation('machine.ram');

        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');

        const value = await visualBuilder.getMetricValue();
        expect(value).to.eql('13,492');
      });

      it('should show same data for kibana and string index pattern modes', async () => {
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const kibanaIndexPatternModeValue = await visualBuilder.getMetricValue();

        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.switchIndexPatternSelectionMode(false);
        const stringIndexPatternModeValue = await visualBuilder.getMetricValue();

        expect(kibanaIndexPatternModeValue).to.eql(stringIndexPatternModeValue);
        expect(kibanaIndexPatternModeValue).to.eql('32,212,254,720');
      });

      describe('Color rules', () => {
        beforeEach(async () => {
          await visualBuilder.selectAggType('Min');
          await visualBuilder.setFieldForAggregation('machine.ram');

          await visualBuilder.clickPanelOptions('metric');
          await visualBuilder.setColorRuleOperator('>= greater than or equal');
          await visualBuilder.setColorRuleValue(0);
        });

        it('should apply color rules to visualization background', async () => {
          await visualBuilder.setColorPickerValue('#FFCFDF');

          const backGroundStyle = await visualBuilder.getBackgroundStyle();
          expect(backGroundStyle).to.eql('background-color: rgb(255, 207, 223);');
        });

        it('should apply color rules to metric value', async () => {
          await visualBuilder.setColorPickerValue('#AD7DE6', 1);

          const backGroundStyle = await visualBuilder.getMetricValueStyle();
          expect(backGroundStyle).to.eql('color: rgb(173, 125, 230);');
        });
      });

      describe('Top Hit aggregation', () => {
        beforeEach(async () => {
          await visualBuilder.selectAggType('Top Hit');
          await visualBuilder.setTopHitOrderByField('@timestamp');
        });

        it('should show correct data for string type field', async () => {
          await visualBuilder.setFieldForAggregation('machine.os.raw');
          await visualBuilder.setTopHitAggregateWithOption('Concatenate');

          const value = await visualBuilder.getMetricValue();
          expect(value).to.eql('win 7');
        });

        it('should show correct data for runtime field', async () => {
          await visualBuilder.setFieldForAggregation('hello_world_runtime_field');
          await visualBuilder.setTopHitAggregateWithOption('Concatenate');

          const value = await visualBuilder.getMetricValue();
          expect(value).to.eql('hello world');
        });
      });
    });

    describe('gauge', () => {
      beforeEach(async () => {
        await visualBuilder.clickGauge();
        await visualBuilder.checkGaugeTabIsPresent();
      });

      it('should "Entire time range" selected as timerange mode for new visualization', async () => {
        await visualBuilder.clickPanelOptions('gauge');
        await visualBuilder.checkSelectedDataTimerangeMode('Entire time range');
        await visualBuilder.clickDataTab('gauge');
      });

      it('should verify gauge label and count display', async () => {
        await visChart.waitForVisualizationRenderingStabilized();
        const gaugeLabel = await visualBuilder.getGaugeLabel();
        const gaugeCount = await visualBuilder.getGaugeCount();
        expect(gaugeLabel).to.be('Count');
        expect(gaugeCount).to.be('13,830');
      });

      it('should display correct data for max aggregation with entire time range mode', async () => {
        await visualBuilder.selectAggType('Max');
        await visualBuilder.setFieldForAggregation('bytes');

        const gaugeLabel = await visualBuilder.getGaugeLabel();
        const gaugeCount = await visualBuilder.getGaugeCount();

        expect(gaugeLabel).to.be('Max of bytes');
        expect(gaugeCount).to.be('19,986');
      });

      it('should display correct data for sum aggregation with last value time range mode', async () => {
        await visualBuilder.selectAggType('Sum');
        await visualBuilder.setFieldForAggregation('memory');
        await visualBuilder.clickPanelOptions('gauge');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');

        const gaugeLabel = await visualBuilder.getGaugeLabel();
        const gaugeCount = await visualBuilder.getGaugeCount();

        expect(gaugeLabel).to.be('Sum of memory');
        expect(gaugeCount).to.be('672,320');
      });

      it('should apply series color to gauge', async () => {
        await visualBuilder.setColorPickerValue('#90CEEAFF');

        const gaugeColor = await visualBuilder.getGaugeColor();
        expect(gaugeColor).to.be('rgb(144, 206, 234)');
      });

      describe('Color rules', () => {
        it('should apply color rules to visualization background and inner gauge circle', async () => {
          await visualBuilder.selectAggType('Filter Ratio');
          await visualBuilder.setFilterRatioOption('Numerator', 'bytes < 0');
          await visualBuilder.clickPanelOptions('gauge');
          await visualBuilder.setColorRuleOperator('< less than');
          await visualBuilder.setColorRuleValue(21);
          await visualBuilder.setBackgroundColor('#FFCFDF');
          await visualBuilder.setColorPickerValue('#AD7DE6', 1);

          const backGroundStyle = await visualBuilder.getBackgroundStyle();
          const gaugeInnerColor = await visualBuilder.getGaugeColor(true);

          expect(backGroundStyle).to.eql('background-color: rgb(255, 207, 223);');
          expect(gaugeInnerColor).to.eql('rgba(173,125,230,1)');
        });

        it('should apply color rules to gauge and its value', async () => {
          await visualBuilder.selectAggType('Cardinality');
          await visualBuilder.setFieldForAggregation('machine.ram');
          await visualBuilder.clickPanelOptions('gauge');
          await visualBuilder.setColorRuleOperator('>= greater than or equal');
          await visualBuilder.setColorRuleValue(20);
          await visualBuilder.setColorPickerValue('#54B399', 2);
          await visualBuilder.setColorPickerValue('#DA8B45', 3);

          const gaugeColor = await visualBuilder.getGaugeColor();
          const gaugeValueStyle = await visualBuilder.getGaugeValueStyle();

          expect(gaugeColor).to.be('rgba(84,179,153,1)');
          expect(gaugeValueStyle).to.eql('color: rgb(218, 139, 69);');
        });
      });
    });

    describe('topN', () => {
      beforeEach(async () => {
        await visualBuilder.clickTopN();
        await visualBuilder.checkTopNTabIsPresent();
        await visualBuilder.clickPanelOptions('topN');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('topN');
      });

      it('should verify topN label and count display', async () => {
        await visChart.waitForVisualizationRenderingStabilized();
        const topNLabel = await visualBuilder.getTopNLabel();
        const topNCount = await visualBuilder.getTopNCount();
        expect(topNLabel).to.be('Count');
        expect(topNCount).to.be('156');
      });

      it('should display correct data for counter rate aggregation with last value time range mode', async () => {
        await visualBuilder.selectAggType('Counter rate');
        await visualBuilder.setFieldForAggregation('memory');

        const topNLabel = await visualBuilder.getTopNLabel();
        const topNCount = await visualBuilder.getTopNCount();

        expect(topNLabel).to.be('Counter Rate of memory');
        expect(topNCount).to.be('29,520');
      });

      it('should display correct data for sum of squares aggregation with entire time range mode', async () => {
        await visualBuilder.selectAggType('Sum of squares');
        await visualBuilder.setFieldForAggregation('bytes');
        await visualBuilder.clickPanelOptions('topN');
        await visualBuilder.setMetricsDataTimerangeMode('Entire time range');

        const topNLabel = await visualBuilder.getTopNLabel();
        const topNCount = await visualBuilder.getTopNCount();

        expect(topNLabel).to.be('Sum of Squares of bytes');
        expect(topNCount).to.be('630,170,001,503');
      });

      it('should apply series color to bar', async () => {
        await visualBuilder.cloneSeries();
        await visualBuilder.setColorPickerValue('#E5FFCF');
        await visualBuilder.setColorPickerValue('#80e08a', 1);

        const firstTopNBarStyle = await visualBuilder.getTopNBarStyle();
        const secondTopNBarStyle = await visualBuilder.getTopNBarStyle(1);

        expect(firstTopNBarStyle).to.contain('background-color: rgb(229, 255, 207);');
        expect(secondTopNBarStyle).to.contain('background-color: rgb(128, 224, 138);');
      });

      describe('Color rules', () => {
        it('should apply color rules to visualization background and bar', async () => {
          await visualBuilder.selectAggType('Value Count');
          await visualBuilder.setFieldForAggregation('machine.ram');
          await visualBuilder.clickPanelOptions('topN');
          await visualBuilder.setColorRuleOperator('<= less than or equal');
          await visualBuilder.setColorRuleValue(153);
          await visualBuilder.setBackgroundColor('#FBFFD4');
          await visualBuilder.setColorPickerValue('#D6BF57', 1);

          const backGroundStyle = await visualBuilder.getBackgroundStyle();
          const topNBarStyle = await visualBuilder.getTopNBarStyle();

          expect(backGroundStyle).to.eql('background-color: rgb(251, 255, 212);');
          expect(topNBarStyle).to.contain('background-color: rgb(214, 191, 87);');
        });
      });
    });

    describe('switch index pattern mode', () => {
      beforeEach(async () => {
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('metric');
        await timePicker.setAbsoluteRange(
          'Sep 19, 2015 @ 06:31:44.000',
          'Sep 22, 2015 @ 18:31:44.000'
        );
      });

      const switchIndexTest = async (useKibanaIndexes: boolean) => {
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setIndexPatternValue('', false);

        // Sometimes popovers take some time to appear in Firefox (#71979)
        await retry.tryForTime(20000, async () => {
          await visualBuilder.setIndexPatternValue('logstash-*', useKibanaIndexes);
          await visualBuilder.waitForIndexPatternTimeFieldOptionsLoaded();
          await visualBuilder.selectIndexPatternTimeField('@timestamp');
        });
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('156');
      };

      it('should be able to switch combo box mode selection', async () => {
        await switchIndexTest(true);
      });

      it('should be able to switch using text mode selection', async () => {
        await switchIndexTest(false);
      });
    });

    describe('switch panel interval test', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage();
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.clickPanelOptions('metric');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await timePicker.setAbsoluteRange(
          'Sep 19, 2015 @ 06:31:44.000',
          'Sep 22, 2015 @ 18:31:44.000'
        );
      });

      it('should be able to switch to gte interval (>=2d)', async () => {
        await visualBuilder.setIntervalValue('>=2d');
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('9,371');
      });

      it('should be able to switch to fixed interval (1d)', async () => {
        await visualBuilder.setIntervalValue('1d');
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('4,614');
      });

      it('should be able to switch to auto interval', async () => {
        await visualBuilder.setIntervalValue('auto');
        const newValue = await visualBuilder.getMetricValue();
        expect(newValue).to.eql('156');
      });
    });

    describe('browser history changes', () => {
      it('should activate previous/next chart tab and panel config', async () => {
        log.debug('Click metric chart');
        await visualBuilder.clickMetric();
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.checkTabIsSelected('metric');

        log.debug('Click Top N chart');
        await visualBuilder.clickTopN();
        await visualBuilder.checkTopNTabIsPresent();
        await visualBuilder.checkTabIsSelected('top_n');

        log.debug('Go back in browser history');
        await browser.goBack();

        log.debug('Check metric chart and panel config is rendered');
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.checkTabIsSelected('metric');
        await visualBuilder.checkPanelConfigIsPresent('metric');

        log.debug('Go back in browser history');
        await browser.goBack();

        log.debug('Check timeseries chart and panel config is rendered');
        await retry.try(async () => {
          await visualBuilder.checkTimeSeriesChartIsPresent();
          await visualBuilder.checkTabIsSelected('timeseries');
          await visualBuilder.checkPanelConfigIsPresent('timeseries');
        });

        log.debug('Go forward in browser history');
        await browser.goForward();

        log.debug('Check metric chart and panel config is rendered');
        await visualBuilder.checkMetricTabIsPresent();
        await visualBuilder.checkTabIsSelected('metric');
        await visualBuilder.checkPanelConfigIsPresent('metric');
      });

      it('should update panel config', async () => {
        const initialLegendItems = ['Count: 156'];
        const finalLegendItems = ['jpg: 106', 'css: 22', 'png: 14', 'gif: 8', 'php: 6'];

        log.debug('Group metrics by terms: extension.raw');
        await visualBuilder.clickPanelOptions('timeSeries');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('timeSeries');
        await visualBuilder.setMetricsGroupByTerms('extension.raw');
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems1 = await visualBuilder.getLegendItemsContent();
        expect(legendItems1).to.eql(finalLegendItems);

        log.debug('Go back in browser history');
        await browser.goBack();
        const isTermsSelected = await visualBuilder.checkSelectedMetricsGroupByValue('Terms');
        expect(isTermsSelected).to.be(true);

        log.debug('Go back in browser history');
        await browser.goBack();
        await visualBuilder.checkSelectedMetricsGroupByValue('Everything');
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems2 = await visualBuilder.getLegendItemsContent();
        expect(legendItems2).to.eql(initialLegendItems);

        log.debug('Go forward twice in browser history');
        await browser.goForward();
        await browser.goForward();
        await visChart.waitForVisualizationRenderingStabilized();
        const legendItems3 = await visualBuilder.getLegendItemsContent();
        expect(legendItems3).to.eql(finalLegendItems);
      });
    });
  });
}
