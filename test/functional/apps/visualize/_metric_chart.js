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
  const log = getService('log');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('metric chart', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickMetric');
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show Count', async function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(expectedCount).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Average', async function () {
      const avgMachineRam = ['13,104,036,080.615', 'Average machine.ram'];
      await PageObjects.visualize.clickMetricEditor();
      log.debug('Aggregation = Average');
      await PageObjects.visualize.selectAggregation('Average');
      log.debug('Field = machine.ram');
      await PageObjects.visualize.selectField('machine.ram', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(avgMachineRam).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Sum', async function () {
      const sumPhpMemory = ['85,865,880', 'Sum of phpmemory'];
      log.debug('Aggregation = Sum');
      await PageObjects.visualize.selectAggregation('Sum');
      log.debug('Field = phpmemory');
      await PageObjects.visualize.selectField('phpmemory', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(sumPhpMemory).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Median', async function () {
      const medianBytes = ['5,565.263', '50th percentile of bytes'];
      //  For now, only comparing the text label part of the metric
      log.debug('Aggregation = Median');
      await PageObjects.visualize.selectAggregation('Median');
      log.debug('Field = bytes');
      await PageObjects.visualize.selectField('bytes', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        // only comparing the text label!
        expect(medianBytes[1]).to.eql(metricValue.split('\n')[1]);
      });
    });

    it('should show Min', async function () {
      const minTimestamp = ['September 20th 2015, 00:00:00.000', 'Min @timestamp'];
      log.debug('Aggregation = Min');
      await PageObjects.visualize.selectAggregation('Min');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(minTimestamp).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Max', async function () {
      const maxRelatedContentArticleModifiedTime = ['April 4th 2015, 00:54:41.000', 'Max relatedContent.article:modified_time'];
      log.debug('Aggregation = Max');
      await PageObjects.visualize.selectAggregation('Max');
      log.debug('Field = relatedContent.article:modified_time');
      await PageObjects.visualize.selectField('relatedContent.article:modified_time', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(maxRelatedContentArticleModifiedTime).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Standard Deviation', async function () {
      const standardDeviationBytes = [
        '-1,435.138', 'Lower Standard Deviation of bytes',
        '12,889.766', 'Upper Standard Deviation of bytes'
      ];
      log.debug('Aggregation = Standard Deviation');
      await PageObjects.visualize.selectAggregation('Standard Deviation');
      log.debug('Field = bytes');
      await PageObjects.visualize.selectField('bytes', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(standardDeviationBytes).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Unique Count', async function () {
      const uniqueCountClientip = ['1,000', 'Unique count of clientip'];
      log.debug('Aggregation = Unique Count');
      await PageObjects.visualize.selectAggregation('Unique Count');
      log.debug('Field = clientip');
      await PageObjects.visualize.selectField('clientip', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(uniqueCountClientip).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Percentiles', async function () {
      const percentileMachineRam = [
        '2,147,483,648', '1st percentile of machine.ram',
        '3,221,225,472', '5th percentile of machine.ram',
        '7,516,192,768', '25th percentile of machine.ram',
        '12,884,901,888', '50th percentile of machine.ram',
        '18,253,611,008', '75th percentile of machine.ram',
        '32,212,254,720', '95th percentile of machine.ram',
        '32,212,254,720', '99th percentile of machine.ram'
      ];

      log.debug('Aggregation = Percentiles');
      await PageObjects.visualize.selectAggregation('Percentiles');
      log.debug('Field =  machine.ram');
      await PageObjects.visualize.selectField('machine.ram', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(percentileMachineRam).to.eql(metricValue.split('\n'));
      });
    });

    it('should show Percentile Ranks', async function () {
      const percentileRankBytes = [ '2.036%', 'Percentile rank 99 of "memory"'];
      log.debug('Aggregation = Percentile Ranks');
      await PageObjects.visualize.selectAggregation('Percentile Ranks');
      log.debug('Field =  bytes');
      await PageObjects.visualize.selectField('memory', 'metrics');
      log.debug('Values =  99');
      await PageObjects.visualize.setValue('99');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(percentileRankBytes).to.eql(metricValue.split('\n'));
      });
    });

  });
}
