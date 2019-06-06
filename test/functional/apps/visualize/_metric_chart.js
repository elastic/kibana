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
  const filterBar = getService('filterBar');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);

  describe('metric chart', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickMetric');
      await PageObjects.visualize.clickMetric();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show Count', async function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(expectedCount).to.eql(metricValue);
      });
    });

    it('should show Average', async function () {
      const avgMachineRam = ['13,104,036,080.615', 'Average machine.ram'];
      await PageObjects.visualize.clickMetricEditor();
      log.debug('Aggregation = Average');
      await PageObjects.visualize.selectAggregation('Average', 'metrics');
      log.debug('Field = machine.ram');
      await PageObjects.visualize.selectField('machine.ram', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(avgMachineRam).to.eql(metricValue);
      });
    });

    it('should show Sum', async function () {
      const sumPhpMemory = ['85,865,880', 'Sum of phpmemory'];
      log.debug('Aggregation = Sum');
      await PageObjects.visualize.selectAggregation('Sum', 'metrics');
      log.debug('Field = phpmemory');
      await PageObjects.visualize.selectField('phpmemory', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(sumPhpMemory).to.eql(metricValue);
      });
    });

    it('should show Median', async function () {
      const medianBytes = ['5,565.263', '50th percentile of bytes'];
      //  For now, only comparing the text label part of the metric
      log.debug('Aggregation = Median');
      await PageObjects.visualize.selectAggregation('Median', 'metrics');
      log.debug('Field = bytes');
      await PageObjects.visualize.selectField('bytes', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        // only comparing the text label!
        expect(medianBytes[1]).to.eql(metricValue[1]);
      });
    });

    it('should show Min', async function () {
      const minTimestamp = ['Sep 20, 2015 @ 00:00:00.000', 'Min @timestamp'];
      log.debug('Aggregation = Min');
      await PageObjects.visualize.selectAggregation('Min', 'metrics');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(minTimestamp).to.eql(metricValue);
      });
    });

    it('should show Max', async function () {
      const maxRelatedContentArticleModifiedTime = ['Apr 4, 2015 @ 00:54:41.000', 'Max relatedContent.article:modified_time'];
      log.debug('Aggregation = Max');
      await PageObjects.visualize.selectAggregation('Max', 'metrics');
      log.debug('Field = relatedContent.article:modified_time');
      await PageObjects.visualize.selectField('relatedContent.article:modified_time', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(maxRelatedContentArticleModifiedTime).to.eql(metricValue);
      });
    });

    it('should show Unique Count', async function () {
      const uniqueCountClientip = ['1,000', 'Unique count of clientip'];
      log.debug('Aggregation = Unique Count');
      await PageObjects.visualize.selectAggregation('Unique Count', 'metrics');
      log.debug('Field = clientip');
      await PageObjects.visualize.selectField('clientip', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(uniqueCountClientip).to.eql(metricValue);
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
      await PageObjects.visualize.selectAggregation('Percentiles', 'metrics');
      log.debug('Field =  machine.ram');
      await PageObjects.visualize.selectField('machine.ram', 'metrics');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(percentileMachineRam).to.eql(metricValue);
      });
    });

    it('should show Percentile Ranks', async function () {
      const percentileRankBytes = [ '2.036%', 'Percentile rank 99 of "memory"'];
      log.debug('Aggregation = Percentile Ranks');
      await PageObjects.visualize.selectAggregation('Percentile Ranks', 'metrics');
      log.debug('Field =  bytes');
      await PageObjects.visualize.selectField('memory', 'metrics');
      log.debug('Values =  99');
      await PageObjects.visualize.setValue('99');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getMetric();
        expect(percentileRankBytes).to.eql(metricValue);
      });
    });

    describe('with filters', function () {
      it('should prevent filtering without buckets', async function () {
        let filterCount = 0;
        await retry.try(async function tryingForTime() {
          // click first metric bucket
          await PageObjects.visualize.clickMetricByIndex(0);
          filterCount = await filterBar.getFilterCount();
        });
        expect(filterCount).to.equal(0);
      });

      it('should allow filtering with buckets', async function () {
        await PageObjects.visualize.clickMetricEditor();
        log.debug('Bucket = Split Group');
        await PageObjects.visualize.clickBucket('Split Group');
        log.debug('Aggregation = Terms');
        await PageObjects.visualize.selectAggregation('Terms');
        log.debug('Field = machine.os.raw');
        await PageObjects.visualize.selectField('machine.os.raw');
        await PageObjects.visualize.clickGo();

        let filterCount = 0;
        await retry.try(async function tryingForTime() {
          // click first metric bucket
          await PageObjects.visualize.clickMetricByIndex(0);
          filterCount = await filterBar.getFilterCount();
        });
        await filterBar.removeAllFilters();
        expect(filterCount).to.equal(1);
      });
    });

  });
}
