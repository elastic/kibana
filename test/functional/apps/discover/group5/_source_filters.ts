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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const { common, timePicker, discover, settings, unifiedFieldList } = getPageObjects([
    'common',
    'timePicker',
    'discover',
    'settings',
    'unifiedFieldList',
  ]);

  describe('source filters', function () {
    before(async function () {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'discover:searchFieldsFromSource': false,
      });

      log.debug('management');
      await common.navigateToApp('settings');
      await settings.clickKibanaIndexPatterns();
      await settings.clickIndexPatternLogstash();
      await settings.addFieldFilter('referer');
      await settings.addFieldFilter('relatedContent*');

      log.debug('discover');
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();

      await retry.try(async function () {
        expect(await discover.getDocHeader()).to.have.string('Document');
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    it('should not get the field referer', async function () {
      const fieldNames = await unifiedFieldList.getAllFieldNames();
      expect(fieldNames).to.not.contain('referer');
      const relatedContentFields = fieldNames.filter(
        (fieldName) => fieldName.indexOf('relatedContent') === 0
      );
      expect(relatedContentFields).to.have.length(0);
    });
  });
}
