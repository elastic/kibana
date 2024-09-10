/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
  ]);

  describe('histogram agg onSearchRequestStart', function () {
    before(async function () {
      // loading back default data
      await kibanaServer.savedObjects.cleanStandardList();

      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');

      await PageObjects.visualize.initTests();
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = Split Rows');
      await PageObjects.visEditor.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visEditor.selectAggregation('Histogram');
      log.debug('Field = machine.ram');
      await PageObjects.visEditor.selectField('machine.ram');
    });

    describe('interval parameter uses autoBounds', function () {
      it('should use provided value when number of generated buckets is less than histogram:maxBars', async function () {
        const providedInterval = '2400000000';
        log.debug(`Interval = ${providedInterval}`);
        await PageObjects.visEditor.setInterval(providedInterval, { type: 'numeric' });
        await PageObjects.visEditor.clickGo();

        await retry.try(async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          expect(data.length).to.eql(10);
          const bucketStart = parseInt((data[0][0] as string).replace(/,/g, ''), 10);
          const bucketEnd = parseInt((data[1][0] as string).replace(/,/g, ''), 10);
          const actualInterval = bucketEnd - bucketStart;
          expect(actualInterval).to.eql(providedInterval);
        });
      });

      it('should scale value to round number when number of generated buckets is greater than histogram:maxBars', async function () {
        const providedInterval = '100';
        log.debug(`Interval = ${providedInterval}`);
        await PageObjects.visEditor.setInterval(providedInterval, { type: 'numeric' });
        await PageObjects.visEditor.clickGo();
        await PageObjects.common.sleep(1000); // fix this
        await retry.try(async () => {
          const data = await PageObjects.visChart.getTableVisContent();
          expect(data.length).to.eql(10);
          const bucketStart = parseInt((data[0][0] as string).replace(/,/g, ''), 10);
          const bucketEnd = parseInt((data[1][0] as string).replace(/,/g, ''), 10);
          const actualInterval = bucketEnd - bucketStart;
          expect(actualInterval).to.eql(1200000000);
        });
      });
    });

    describe('autoBounds are not set for number_range data', function () {
      it('should use provided value when number of generated buckets is less than histogram:maxBars', async function () {
        log.debug('Field = machine.ram_range');
        await PageObjects.visEditor.selectField('machine.ram_range');
        await retry.waitFor('interval to be set', async () => {
          return Boolean(await PageObjects.visEditor.getNumericInterval());
        });
        expect(await PageObjects.visEditor.getNumericInterval()).to.eql(100);
      });
    });
  });
}
