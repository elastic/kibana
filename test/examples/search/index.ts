/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const indexPatterns = getService('indexPatterns');
  const comboBox = getService('comboBox');
  const esArchiver = getService('esArchiver');

  describe('Search examples', () => {
    describe('handling warnings with search source fetch', function () {
      before(async () => {
        // create rollup data
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/search/downsampled');
        await es.indices.addBlock({ index: 'sample-01', block: 'write' });
        try {
          await es.rollup.rollup({
            index: 'sample-01',
            rollup_index: 'sample-01-rollup',
            config: { fixed_interval: '1h' },
          });
        } catch (err) {
          if (!err.message.match(/resource_already_exists_exception/)) {
            throw err;
          }
        }

        await indexPatterns.create(
          {
            title: 'sample-01,sample-01-rollup',
            timeFieldName: '@timestamp',
          },
          { override: true }
        );

        await PageObjects.common.navigateToApp('searchExamples');

        await comboBox.setCustom('dataViewSelector', 'sample-01,sample-01-rollup');
        await comboBox.set('searchMetricField', 'kubernetes.container.memory.usage.bytes');
        await PageObjects.timePicker.setAbsoluteRange(
          'Aug 1, 2021 @ 00:00:00.000',
          'Aug 1, 2022 @ 00:00:00.000'
        );
      });

      it('shows shard failure warning notifications by default', async () => {
        await testSubjects.click('searchSourceWithOther');
        // FIXME: validate warning toast notifications
      });

      it('able to handle shard failure warnings and prevent default notifications', async () => {
        await testSubjects.click('searchSourceWithoutOther');
        // FIXME: validate warning content in the results tab
      });
    });
  });
}
