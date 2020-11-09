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
  ]);

  // Failing: See https://github.com/elastic/kibana/issues/75127
  describe.skip('visual builder', function describeIndexTests() {
    this.tags('includeFirefox');
    beforeEach(async () => {
      await security.testUser.setRoles([
        'kibana_admin',
        'test_logstash_reader',
        'kibana_sample_admin',
      ]);
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualBuilder.checkVisualBuilderIsPresent();
    });

    describe('metric', () => {
      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
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

      it('should verify gauge label and count display', async () => {
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const labelString = await PageObjects.visualBuilder.getGaugeLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getGaugeCount();
        expect(gaugeCount).to.be('156');
      });
    });

    describe('topN', () => {
      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickTopN();
        await PageObjects.visualBuilder.checkTopNTabIsPresent();
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
      beforeEach(async () => {
        log.debug('Load kibana_sample_data_flights data');
        await esArchiver.loadIfNeeded('kibana_sample_data_flights');
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.checkMetricTabIsPresent();
      });
      after(async () => {
        await security.testUser.restoreDefaults();
        await esArchiver.unload('kibana_sample_data_flights');
      });

      it('should be able to switch between index patterns', async () => {
        const value = await PageObjects.visualBuilder.getMetricValue();
        expect(value).to.eql('156');
        await PageObjects.visualBuilder.clickPanelOptions('metric');
        const fromTime = 'Oct 22, 2018 @ 00:00:00.000';
        const toTime = 'Oct 28, 2018 @ 23:59:59.999';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        // Sometimes popovers take some time to appear in Firefox (#71979)
        await retry.tryForTime(20000, async () => {
          await PageObjects.visualBuilder.setIndexPatternValue('kibana_sample_data_flights');
          await PageObjects.visualBuilder.waitForIndexPatternTimeFieldOptionsLoaded();
          await PageObjects.visualBuilder.selectIndexPatternTimeField('timestamp');
        });
        const newValue = await PageObjects.visualBuilder.getMetricValue();
        expect(newValue).to.eql('10');
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
        await PageObjects.visualBuilder.checkTimeSeriesChartIsPresent();
        await PageObjects.visualBuilder.checkTabIsSelected('timeseries');
        await PageObjects.visualBuilder.checkPanelConfigIsPresent('timeseries');

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
