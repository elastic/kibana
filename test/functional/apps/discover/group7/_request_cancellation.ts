/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'header']);

  describe('Discover request cancellation', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
    });

    it('should allow cancelling active requests', async () => {
      await PageObjects.discover.selectIndexPattern('logstash-*');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.hasNoResults()).to.be(false);
      await testSubjects.existOrFail('querySubmitButton');
      await testSubjects.missingOrFail('queryCancelButton');
      await filterBar.addDslFilter(
        JSON.stringify({
          error_query: {
            indices: [
              {
                error_type: 'none',
                name: 'logstash-*',
                stall_time_seconds: 30,
              },
            ],
          },
        }),
        false
      );
      await retry.try(async () => {
        await testSubjects.missingOrFail('querySubmitButton');
        await testSubjects.existOrFail('queryCancelButton');
      });
      await testSubjects.click('queryCancelButton');
      await retry.try(async () => {
        expect(await PageObjects.discover.hasNoResults()).to.be(true);
        await testSubjects.existOrFail('querySubmitButton');
        await testSubjects.missingOrFail('queryCancelButton');
      });
      await filterBar.removeAllFilters();
    });
  });
}
