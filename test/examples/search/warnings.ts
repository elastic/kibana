/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const es = getService('es');
  const log = getService('log');
  const indexPatterns = getService('indexPatterns');
  const comboBox = getService('comboBox');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('handling warnings with search source fetch', function () {
    const dataViewTitle = 'sample-01,sample-01-rollup';
    const fromTime = 'Jun 17, 2022 @ 00:00:00.000';
    const toTime = 'Jun 23, 2022 @ 00:00:00.000';
    const testArchive = 'test/functional/fixtures/es_archiver/search/downsampled';
    const testIndex = 'sample-01';
    const testRollupIndex = 'sample-01-rollup';
    const testRollupField = 'kubernetes.container.memory.usage.bytes';
    const toastsSelector = '[data-test-subj=globalToastList] [data-test-subj=euiToastHeader]';
    const shardFailureType = 'unsupported_aggregation_on_rollup_index';
    const shardFailureReason = `Field [${testRollupField}] of type [aggregate_metric_double] is not supported for aggregation [percentiles]`;

    const getTestJson = async (tabTestSubj: string, codeTestSubj: string) => {
      log.info(`switch to ${tabTestSubj} tab...`);
      await testSubjects.click(tabTestSubj);
      const block = await testSubjects.find(codeTestSubj);
      const testText = (await block.getVisibleText()).trim();
      return testText && JSON.parse(testText);
    };

    before(async () => {
      // create rollup data
      log.info(`loading ${testIndex} index...`);
      await esArchiver.loadIfNeeded(testArchive);
      log.info(`add write block to ${testIndex} index...`);
      await es.indices.addBlock({ index: testIndex, block: 'write' });
      try {
        log.info(`rolling up ${testIndex} index...`);
        await es.rollup.rollup({
          index: testIndex,
          rollup_index: testRollupIndex,
          config: { fixed_interval: '1h' },
        });
      } catch (err) {
        log.info(`ignoring resource_already_exists_exception...`);
        if (!err.message.match(/resource_already_exists_exception/)) {
          throw err;
        }
      }

      log.info(`creating ${dataViewTitle} data view...`);
      await indexPatterns.create(
        {
          title: dataViewTitle,
          timeFieldName: '@timestamp',
        },
        { override: true }
      );
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        defaultIndex: '0ae0bc7a-e4ca-405c-ab67-f2b5913f2a51',
        'timepicker:timeDefaults': '{ "from": "now-1y", "to": "now" }',
      });
    });

    after(async () => {
      await es.indices.delete({ index: [testIndex, testRollupIndex] });
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async () => {
      // reload the page to clear toasts from previous test

      await PageObjects.common.navigateToApp('searchExamples');

      await comboBox.setCustom('dataViewSelector', dataViewTitle);
      await comboBox.set('searchMetricField', testRollupField);
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    it('shows shard failure warning notifications by default', async () => {
      await testSubjects.click('searchSourceWithOther');

      // toasts
      const toasts = await find.allByCssSelector(toastsSelector);
      expect(toasts.length).to.be(3);
      const expects = ['2 of 4 shards failed', '2 of 4 shards failed', 'Query result']; // BUG: there are 2 shards failed toast notifications
      await asyncForEach(toasts, async (t, index) => {
        expect(await t.getVisibleText()).to.eql(expects[index]);
      });

      // click "see full error" button in the toast
      const [openShardModalButton] = await testSubjects.findAll('openShardFailureModalBtn');
      await openShardModalButton.click();
      const modalHeader = await testSubjects.find('shardFailureModalTitle');
      expect(await modalHeader.getVisibleText()).to.be('2 of 4 shards failed');
      // request
      await testSubjects.click('shardFailuresModalRequestButton');
      const requestBlock = await testSubjects.find('shardsFailedModalRequestBlock');
      expect(await requestBlock.getVisibleText()).to.contain(testRollupField);
      // response
      await testSubjects.click('shardFailuresModalResponseButton');
      const responseBlock = await testSubjects.find('shardsFailedModalResponseBlock');
      expect(await responseBlock.getVisibleText()).to.contain(shardFailureReason);

      // close things
      await testSubjects.click('closeShardFailureModal');
      await PageObjects.common.clearAllToasts();

      // response tab
      const response = await getTestJson('responseTab', 'responseCodeBlock');
      expect(response._shards.total).to.be(4);
      expect(response._shards.successful).to.be(2);
      expect(response._shards.skipped).to.be(0);
      expect(response._shards.failed).to.be(2);
      expect(response._shards.failures.length).to.equal(1);
      expect(response._shards.failures[0].index).to.equal(testRollupIndex);
      expect(response._shards.failures[0].reason.type).to.equal(shardFailureType);
      expect(response._shards.failures[0].reason.reason).to.equal(shardFailureReason);

      // warnings tab
      const warnings = await getTestJson('warningsTab', 'warningsCodeBlock');
      expect(warnings).to.eql([]);
    });

    it('able to handle shard failure warnings and prevent default notifications', async () => {
      await testSubjects.click('searchSourceWithoutOther');

      // toasts
      const toasts = await find.allByCssSelector(toastsSelector);
      expect(toasts.length).to.be(2);
      const expects = ['2 of 4 shards failed', 'Query result'];
      await asyncForEach(toasts, async (t, index) => {
        expect(await t.getVisibleText()).to.eql(expects[index]);
      });

      // click "see full error" button in the toast
      const [openShardModalButton] = await testSubjects.findAll('openShardFailureModalBtn');
      await openShardModalButton.click();
      const modalHeader = await testSubjects.find('shardFailureModalTitle');
      expect(await modalHeader.getVisibleText()).to.be('2 of 4 shards failed');
      // request
      await testSubjects.click('shardFailuresModalRequestButton');
      const requestBlock = await testSubjects.find('shardsFailedModalRequestBlock');
      expect(await requestBlock.getVisibleText()).to.contain(testRollupField);
      // response
      await testSubjects.click('shardFailuresModalResponseButton');
      const responseBlock = await testSubjects.find('shardsFailedModalResponseBlock');
      expect(await responseBlock.getVisibleText()).to.contain(shardFailureReason);

      // close things
      await testSubjects.click('closeShardFailureModal');
      await PageObjects.common.clearAllToasts();

      // response tab
      const response = await getTestJson('responseTab', 'responseCodeBlock');
      expect(response._shards.total).to.be(4);
      expect(response._shards.successful).to.be(2);
      expect(response._shards.skipped).to.be(0);
      expect(response._shards.failed).to.be(2);
      expect(response._shards.failures.length).to.equal(1);
      expect(response._shards.failures[0].index).to.equal(testRollupIndex);
      expect(response._shards.failures[0].reason.type).to.equal(shardFailureType);
      expect(response._shards.failures[0].reason.reason).to.equal(shardFailureReason);

      // warnings tab
      const warnings = await getTestJson('warningsTab', 'warningsCodeBlock');
      expect(warnings).to.eql([
        {
          type: 'shard_failure',
          message: '2 of 4 shards failed',
          reason: { reason: shardFailureReason, type: shardFailureType },
          text: 'The data you are seeing might be incomplete or wrong.',
        },
      ]);
    });
  });
}
