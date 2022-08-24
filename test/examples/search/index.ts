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
  const esArchiver = getService('esArchiver');

  describe('Search examples', () => {
    describe('handling warnings with search source fetch', function () {
      const dataViewTitle = 'sample-01,sample-01-rollup';

      before(async () => {
        // create rollup data
        log.info(`loading sample-01 index...`);
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/search/downsampled');
        log.info(`add write block to sample-01 index...`);
        await es.indices.addBlock({ index: 'sample-01', block: 'write' });
        try {
          log.info(`rolling up sample-01 index...`);
          await es.rollup.rollup({
            index: 'sample-01',
            rollup_index: 'sample-01-rollup',
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
      });

      beforeEach(async () => {
        // reload the page to clear toasts from previous test

        await PageObjects.common.navigateToApp('searchExamples');

        await comboBox.setCustom('dataViewSelector', dataViewTitle);
        await comboBox.set('searchMetricField', 'kubernetes.container.memory.usage.bytes');
        await PageObjects.timePicker.setAbsoluteRange(
          'Aug 1, 2021 @ 00:00:00.000',
          'Aug 1, 2022 @ 00:00:00.000'
        );
      });

      it('shows shard failure warning notifications by default', async () => {
        await testSubjects.click('searchSourceWithOther');
        const toasts = await find.allByCssSelector(
          '[data-test-subj=globalToastList] [data-test-subj=euiToastHeader]'
        );
        expect(toasts.length).to.be(3);
        const expects = ['2 of 4 shards failed', '2 of 4 shards failed', 'Query result'];
        await asyncForEach(toasts, async (t, index) => {
          expect(await t.getVisibleText()).to.eql(expects[index]);
        });
      });

      it('able to handle shard failure warnings and prevent default notifications', async () => {
        await testSubjects.click('searchSourceWithoutOther');
        const toasts = await find.allByCssSelector(
          '[data-test-subj=globalToastList] [data-test-subj=euiToastHeader]'
        );
        expect(toasts.length).to.be(1);
        expect(await toasts[0].getVisibleText()).to.eql('Query result');
      });
    });
  });
}
