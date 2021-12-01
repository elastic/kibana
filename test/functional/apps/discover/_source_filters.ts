/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'header', 'settings']);

  describe('source filters', function () {
    before(async function () {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'discover:searchFieldsFromSource': false,
      });

      log.debug('management');
      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.addFieldFilter('referer');
      await PageObjects.settings.addFieldFilter('relatedContent*');

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await retry.try(async function () {
        expect(await PageObjects.discover.getDocHeader()).to.have.string('Document');
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    it('should not get the field referer', async function () {
      const fieldNames = await PageObjects.discover.getAllFieldNames();
      expect(fieldNames).to.not.contain('referer');
      const relatedContentFields = fieldNames.filter(
        (fieldName) => fieldName.indexOf('relatedContent') === 0
      );
      expect(relatedContentFields).to.have.length(0);
    });
  });
}
