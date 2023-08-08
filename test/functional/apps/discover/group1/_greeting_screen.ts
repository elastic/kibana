/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover greeting screen', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'version_test', 'test_logstash_reader']);
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should create a data view when there are no data views', async () => {
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('management');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('dataViews');
      await testSubjects.click('checkboxSelectAll');

      await testSubjects.click('delete-data-views-button');
      await testSubjects.click('confirmModalConfirmButton');

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('createDataViewButton');

      await testSubjects.setValue('createIndexPatternTitleInput', 'logs', {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await retry.waitFor('timestamp field loaded', async () => {
        const timestampField = await testSubjects.find('timestampField');
        return !(await timestampField.elementHasClass('euiComboBox-isDisabled'));
      });
      await testSubjects.click('saveIndexPatternButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.isAdHocDataViewSelected()).to.be(false);

      await PageObjects.discover.createAdHocDataView('log', true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.isAdHocDataViewSelected()).to.be(true);

      expect(await PageObjects.discover.getIndexPatterns()).to.eql(['log*\nTemporary', 'logs*']);
    });
  });
}
