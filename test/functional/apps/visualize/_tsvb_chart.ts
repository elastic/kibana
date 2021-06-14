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
  const testSubjects = getService('testSubjects');

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
      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
        await PageObjects.visualBuilder.clickPanelOptions('metric');
        await PageObjects.visualBuilder.setMetricsDataTimerangeMode('Last value');
        await PageObjects.visualBuilder.setDropLastBucket(true);
        await PageObjects.visualBuilder.clickDataTab('metric');
      });

      it('should not have inspector enabled', async () => {
        await inspector.expectIsNotEnabled();
      });

      it('should show correct data', async () => {
        const value = await PageObjects.visualBuilder.getMetricValue();
        expect(value).to.eql('156');
      });

      it('should show correct data with Math Aggregation', async () => {
        await PageObjects.visualBuilder.createNewAgg();
        await PageObjects.visualBuilder.selectAggType('math', 1);
        await PageObjects.visualBuilder.fillInVariable();
        await PageObjects.visualBuilder.fillInExpression('params.test + 1');
        const value = await PageObjects.visualBuilder.getMetricValue();
        expect(value).to.eql('157');
      });

      it('should populate fields for basic functions', async () => {
        const { visualBuilder } = PageObjects;

        await visualBuilder.selectAggType('Average');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();

        expect(isFieldForAggregationValid).to.be(true);
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

    describe('switch index patterns', () => {
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

    describe('applying field formats from Advanced Settings', () => {
      const termsField = 'machine.os.raw';

      const toggleSetFormatForFieldInIndexPatterns = async (fieldName: string) => {
        log.debug(
          'Navigate to Advanced Settings Index Patterns and toggle Set Format for the specified field'
        );
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.filterField(fieldName);
        await PageObjects.settings.openControlsByName(fieldName);
        const formatRow = await testSubjects.find('formatRow');
        const [formatRowToggle] = await formatRow.findAllByCssSelector('[data-test-subj="toggle"]');
        await formatRowToggle.click();
      };

      before(async () => {
        log.debug('Toggle on Set Format for machine.os.raw and set it to the title case');
        await toggleSetFormatForFieldInIndexPatterns(termsField);
        await PageObjects.settings.setFieldFormat('string');
        await PageObjects.settings.setScriptedFieldStringTransform('title');
        await PageObjects.settings.controlChangeSave();
      });

      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.selectAggType('Average');
        await PageObjects.visualBuilder.setFieldForAggregation('bytes');
        await PageObjects.visualBuilder.setMetricsGroupByTerms(termsField);
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
      });

      it('should display title field formatted labels with raw values', async () => {
        const expectedLegendItems = [
          'Win 8: 5,087.5',
          'Win Xp: 4,332',
          'Win 7: 6,328.938',
          'Ios: 5,980',
          'Osx: 6,070',
        ];
        const legendItems = await PageObjects.visualBuilder.getLegendItemsContent();

        expect(legendItems).to.eql(expectedLegendItems);
      });

      it('should display title field formatted labels with TSVB formatted values by default', async () => {
        const expectedLegendItems = [
          'Win 8: 5,087.5 format',
          'Win Xp: 4,332 format',
          'Win 7: 6,328.938 format',
          'Ios: 5,980 format',
          'Osx: 6,070 format',
        ];

        await PageObjects.visualBuilder.clickSeriesOption();
        await PageObjects.visualBuilder.enterSeriesTemplate('{{value}} format');
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();

        const legendItems = await PageObjects.visualBuilder.getLegendItemsContent();
        expect(legendItems).to.eql(expectedLegendItems);
      });

      it('should display title field formatted labels with byte field formatted values', async () => {
        const expectedLegendItems = [
          'Win 8: 4.968KB',
          'Win Xp: 4.23KB',
          'Win 7: 6.181KB',
          'Ios: 5.84KB',
          'Osx: 5.928KB',
        ];

        await PageObjects.visualBuilder.clickSeriesOption();
        await PageObjects.visualBuilder.setSeriesIgnoreFieldFormatting(false);

        const legendItems = await PageObjects.visualBuilder.getLegendItemsContent();
        expect(legendItems).to.eql(expectedLegendItems);
      });

      describe('formatting values for Metric, TopN and Gauge', () => {
        beforeEach(async () => {
          await PageObjects.visualBuilder.clickSeriesOption();
          await PageObjects.visualBuilder.setSeriesIgnoreFieldFormatting(false);
        });

        it('should display field formatted value for Metric', async () => {
          await PageObjects.visualBuilder.clickMetric();
          await PageObjects.visualBuilder.checkMetricTabIsPresent();

          const metricValue = await PageObjects.visualBuilder.getMetricValue();
          expect(metricValue).to.eql('5.514KB');
        });

        it('should display field formatted label and value for TopN', async () => {
          await PageObjects.visualBuilder.clickTopN();
          await PageObjects.visualBuilder.checkTopNTabIsPresent();

          const topNLabel = await PageObjects.visualBuilder.getTopNLabel();
          const topNCount = await PageObjects.visualBuilder.getTopNCount();

          expect(topNLabel).to.eql('Win 7');
          expect(topNCount).to.eql('5.664KB');
        });

        it('should display field formatted label and value for Gauge', async () => {
          await PageObjects.visualBuilder.clickGauge();
          await PageObjects.visualBuilder.checkGaugeTabIsPresent();

          const gaugeLabel = await PageObjects.visualBuilder.getGaugeLabel();
          const gaugeCount = await PageObjects.visualBuilder.getGaugeCount();

          expect(gaugeLabel).to.eql('Average of bytes');
          expect(gaugeCount).to.eql('5.514KB');
        });
      });

      after(async () => {
        log.debug('Toggle off Set Format for machine.os.raw');
        await toggleSetFormatForFieldInIndexPatterns(termsField);
      });
    });
  });
}
