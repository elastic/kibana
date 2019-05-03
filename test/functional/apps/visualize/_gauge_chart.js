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

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);

  describe('gauge chart', function indexPatternCreation() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickGauge');
      await PageObjects.visualize.clickGauge();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });


    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show Count', function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      return retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getGaugeValue();
        expect(expectedCount).to.eql(metricValue);
      });
    });

    it('should show Split Gauges', async function () {
      await PageObjects.visualize.clickMetricEditor();
      log.debug('Bucket = Split Group');
      await PageObjects.visualize.clickBucket('Split Group');
      log.debug('Aggregation = Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = machine.os.raw');
      await PageObjects.visualize.selectField('machine.os.raw');
      log.debug('Size = 4');
      await PageObjects.visualize.setSize('4');
      await PageObjects.visualize.clickGo();

      await retry.try(async () => {
        expect(await PageObjects.visualize.getGaugeValue()).to.eql([
          '2,904', 'win 8',
          '2,858', 'win xp',
          '2,814', 'win 7',
          '2,784', 'ios',
        ]);
      });
    });

    it('should show correct values for fields with fieldFormatters', async function () {
      const expectedTexts = [ '2,904', 'win 8: Count', '0B', 'win 8: Min bytes' ];

      await PageObjects.visualize.clickMetricEditor();
      await PageObjects.visualize.selectAggregation('Terms');
      await PageObjects.visualize.selectField('machine.os.raw');
      await PageObjects.visualize.setSize('1');
      await PageObjects.visualize.clickAddMetric();
      await PageObjects.visualize.clickBucket('Metric', 'metric');
      await PageObjects.visualize.selectAggregation('Min', 'metrics');
      await PageObjects.visualize.selectField('bytes', 'metrics');
      await PageObjects.visualize.clickGo();

      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getGaugeValue();
        expect(expectedTexts).to.eql(metricValue);
      });
    });

  });
}
