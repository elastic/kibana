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

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const inspector = getService('inspector');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['visualize', 'visualBuilder', 'timePicker']);

  describe('visual builder', function describeIndexTests() {
    beforeEach(async () => {
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
    });

    describe('gauge', () => {
      beforeEach(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickGauge();
        await PageObjects.visualBuilder.checkGaugeTabIsPresent();
      });

      it('should verify gauge label and count display', async () => {
        await PageObjects.visualize.waitForVisualizationRenderingStabilized();
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
        await PageObjects.visualize.waitForVisualizationRenderingStabilized();
        const labelString = await PageObjects.visualBuilder.getTopNLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getTopNCount();
        expect(gaugeCount).to.be('156');
      });
    });

    describe.skip('switch index patterns', () => {
      before(async () => {
        log.debug('Load kibana_sample_data_flights data');
        await esArchiver.loadIfNeeded('kibana_sample_data_flights');
        await PageObjects.visualBuilder.resetPage(
          '2015-09-19 06:31:44.000',
          '2018-10-31 00:0:00.000'
        );
        await PageObjects.visualBuilder.clickMetric();
      });
      after(async () => {
        await esArchiver.unload('kibana_sample_data_flights');
      });
      it('should be able to switch between index patterns', async () => {
        const expectedMetricValue = '156';
        const value = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${value}`);
        expect(value).to.eql(expectedMetricValue);
        await PageObjects.visualBuilder.clickMetricPanelOptions();
        const fromTime = '2018-10-22 00:00:00.000';
        const toTime = '2018-10-28 23:59:59.999';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualBuilder.setIndexPatternValue('kibana_sample_data_flights');
        await PageObjects.visualBuilder.selectIndexPatternTimeField('timestamp');
        const newValue = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${newValue}`);
        expect(newValue).to.eql('10');
      });
    });

    describe.skip('dark mode', () => {
      it('uses dark mode flag', async () => {
        await kibanaServer.uiSettings.update({
          'theme:darkMode': true,
        });

        await PageObjects.visualBuilder.resetPage();
        const classNames = await testSubjects.getAttribute('timeseriesChart', 'class');
        expect(classNames.includes('reversed')).to.be(true);
      });
    });
  });
}
