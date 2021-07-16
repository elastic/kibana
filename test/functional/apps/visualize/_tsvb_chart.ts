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
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const security = getService('security');

  const PageObjects = getPageObjects([
    'visualize',
    'visualBuilder',
    'timePicker',
    'visChart',
    'common',
    'settings',
  ]);

  describe('visual builder', function describeIndexTests() {
    this.tags('includeFirefox');

    before(async () => {
      await PageObjects.visualize.initTests();
    });

    beforeEach(async () => {
      await security.testUser.setRoles(
        ['kibana_admin', 'test_logstash_reader', 'kibana_sample_admin'],
        false
      );
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualBuilder.checkVisualBuilderIsPresent();
    });

    describe('metric', () => {
      const { visualBuilder } = PageObjects;

      beforeEach(async () => {
        await visualBuilder.resetPage();
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
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickGauge();
        await PageObjects.visualBuilder.checkGaugeTabIsPresent();
      });

      it('should "Entire time range" selected as timerange mode for new visualization', async () => {
        await PageObjects.visualBuilder.clickPanelOptions('gauge');
        await PageObjects.visualBuilder.checkSelectedDataTimerangeMode('Entire time range');
        await PageObjects.visualBuilder.clickDataTab('gauge');
      });

      it('should verify gauge label and count display', async () => {
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const labelString = await PageObjects.visualBuilder.getGaugeLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getGaugeCount();
        expect(gaugeCount).to.be('13,830');
      });
    });

    describe('topN', () => {
      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickTopN();
        await PageObjects.visualBuilder.checkTopNTabIsPresent();
        await PageObjects.visualBuilder.clickPanelOptions('topN');
        await PageObjects.visualBuilder.setMetricsDataTimerangeMode('Last value');
        await PageObjects.visualBuilder.setDropLastBucket(true);
        await PageObjects.visualBuilder.clickDataTab('topN');
      });

      it('should verify topN label and count display', async () => {
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const labelString = await PageObjects.visualBuilder.getTopNLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getTopNCount();
        expect(gaugeCount).to.be('156');
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/103252
    describe.skip('switch index patterns', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
        );
      });

      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
        await PageObjects.visualBuilder.clickPanelOptions('metric');
        await PageObjects.visualBuilder.setMetricsDataTimerangeMode('Last value');
        await PageObjects.visualBuilder.setDropLastBucket(true);
        await PageObjects.visualBuilder.clickDataTab('metric');
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 22, 2019 @ 00:00:00.000',
          'Sep 23, 2019 @ 00:00:00.000'
        );
      });

      after(async () => {
        await security.testUser.restoreDefaults();
        await esArchiver.load('test/functional/fixtures/es_archiver/empty_kibana');
        await PageObjects.visualize.initTests();
      });

      const switchIndexTest = async (useKibanaIndexes: boolean) => {
        await PageObjects.visualBuilder.clickPanelOptions('metric');
        await PageObjects.visualBuilder.setIndexPatternValue('', false);

        const value = await PageObjects.visualBuilder.getMetricValue();
        expect(value).to.eql('0');

        // Sometimes popovers take some time to appear in Firefox (#71979)
        await retry.tryForTime(20000, async () => {
          await PageObjects.visualBuilder.setIndexPatternValue('with-timefield', useKibanaIndexes);
          await PageObjects.visualBuilder.waitForIndexPatternTimeFieldOptionsLoaded();
          await PageObjects.visualBuilder.selectIndexPatternTimeField('timestamp');
        });
        const newValue = await PageObjects.visualBuilder.getMetricValue();
        expect(newValue).to.eql('1');
      };

      it('should be able to switch using text mode selection', async () => {
        await switchIndexTest(false);
      });

      it('should be able to switch combo box mode selection', async () => {
        await switchIndexTest(true);
      });
    });

    describe('browser history changes', () => {
      it('should activate previous/next chart tab and panel config', async () => {
        await PageObjects.visualBuilder.resetPage();

        log.debug('Click metric chart');
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
        await PageObjects.visualBuilder.checkTabIsSelected('metric');

        log.debug('Click Top N chart');
        await PageObjects.visualBuilder.clickTopN();
        await PageObjects.visualBuilder.checkTopNTabIsPresent();
        await PageObjects.visualBuilder.checkTabIsSelected('top_n');

        log.debug('Go back in browser history');
        await browser.goBack();

        log.debug('Check metric chart and panel config is rendered');
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
        await PageObjects.visualBuilder.checkTabIsSelected('metric');
        await PageObjects.visualBuilder.checkPanelConfigIsPresent('metric');

        log.debug('Go back in browser history');
        await browser.goBack();

        log.debug('Check timeseries chart and panel config is rendered');
        await retry.try(async () => {
          await PageObjects.visualBuilder.checkTimeSeriesChartIsPresent();
          await PageObjects.visualBuilder.checkTabIsSelected('timeseries');
          await PageObjects.visualBuilder.checkPanelConfigIsPresent('timeseries');
        });

        log.debug('Go forward in browser history');
        await browser.goForward();

        log.debug('Check metric chart and panel config is rendered');
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
        await PageObjects.visualBuilder.checkTabIsSelected('metric');
        await PageObjects.visualBuilder.checkPanelConfigIsPresent('metric');
      });

      it('should update panel config', async () => {
        await PageObjects.visualBuilder.resetPage();

        const initialLegendItems = ['Count: 156'];
        const finalLegendItems = ['jpg: 106', 'css: 22', 'png: 14', 'gif: 8', 'php: 6'];

        log.debug('Group metrics by terms: extension.raw');
        await PageObjects.visualBuilder.clickPanelOptions('timeSeries');
        await PageObjects.visualBuilder.setDropLastBucket(true);
        await PageObjects.visualBuilder.clickDataTab('timeSeries');
        await PageObjects.visualBuilder.setMetricsGroupByTerms('extension.raw');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const legendItems1 = await PageObjects.visualBuilder.getLegendItemsContent();
        expect(legendItems1).to.eql(finalLegendItems);

        log.debug('Go back in browser history');
        await browser.goBack();
        const isTermsSelected = await PageObjects.visualBuilder.checkSelectedMetricsGroupByValue(
          'Terms'
        );
        expect(isTermsSelected).to.be(true);

        log.debug('Go back in browser history');
        await browser.goBack();
        await PageObjects.visualBuilder.checkSelectedMetricsGroupByValue('Everything');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const legendItems2 = await PageObjects.visualBuilder.getLegendItemsContent();
        expect(legendItems2).to.eql(initialLegendItems);

        log.debug('Go forward twice in browser history');
        await browser.goForward();
        await browser.goForward();
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const legendItems3 = await PageObjects.visualBuilder.getLegendItemsContent();
        expect(legendItems3).to.eql(finalLegendItems);
      });
    });
  });
}
