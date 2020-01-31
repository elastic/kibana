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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);

  describe('histogram agg onSearchRequestStart', function() {
    before(async function() {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = Split Rows');
      await PageObjects.visualize.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visualize.selectAggregation('Histogram');
      log.debug('Field = machine.ram');
      await PageObjects.visualize.selectField('machine.ram');
    });

    describe('interval parameter uses autoBounds', function() {
      it('should use provided value when number of generated buckets is less than histogram:maxBars', async function() {
        const providedInterval = 2400000000;
        log.debug(`Interval = ${providedInterval}`);
        await PageObjects.visualize.setNumericInterval(providedInterval);
        await PageObjects.visualize.clickGo();
        await retry.try(async () => {
          const data = await PageObjects.visualize.getTableVisData();
          const dataArray = data.replace(/,/g, '').split('\n');
          expect(dataArray.length).to.eql(20);
          const bucketStart = parseInt(dataArray[0], 10);
          const bucketEnd = parseInt(dataArray[2], 10);
          const actualInterval = bucketEnd - bucketStart;
          expect(actualInterval).to.eql(providedInterval);
        });
      });

      it('should scale value to round number when number of generated buckets is greater than histogram:maxBars', async function() {
        const providedInterval = 100;
        log.debug(`Interval = ${providedInterval}`);
        await PageObjects.visualize.setNumericInterval(providedInterval);
        await PageObjects.visualize.clickGo();
        await PageObjects.common.sleep(1000); //fix this
        await retry.try(async () => {
          const data = await PageObjects.visualize.getTableVisData();
          const dataArray = data.replace(/,/g, '').split('\n');
          expect(dataArray.length).to.eql(20);
          const bucketStart = parseInt(dataArray[0], 10);
          const bucketEnd = parseInt(dataArray[2], 10);
          const actualInterval = bucketEnd - bucketStart;
          expect(actualInterval).to.eql(1200000000);
        });
      });
    });
  });
}
