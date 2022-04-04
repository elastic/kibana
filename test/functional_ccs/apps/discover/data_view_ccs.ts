/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const remoteEsArchiver = getService('remoteEsArchiver');

  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const createDataView = async (dataViewName: string) => {
    await PageObjects.discover.clickIndexPatternActions();
    await PageObjects.discover.clickCreateNewDataView();
    await testSubjects.setValue('createIndexPatternTitleInput', dataViewName, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    await testSubjects.click('saveIndexPatternButton');
  };

  describe('discover integration with data view editor', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles([
        'kibana_admin',
        'test_logstash_reader',
        'ccs_remote_search',
      ]);
      await remoteEsArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.savedObjects.clean({ types: ['saved-search', 'index-pattern'] });
      // The test creates the 'ftr-remote:logstash*" data view but we have to load the discover_ccs
      // which contains ftr-remote:logstash-* otherwise, discover will redirect us to another page.
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover_ccs');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover_ccs');
      await kibanaServer.savedObjects.clean({ types: ['saved-search', 'index-pattern'] });
    });

    it('use ccs to create a new data view', async function () {
      const dataViewToCreate = 'ftr-remote:logstash';
      await createDataView(dataViewToCreate);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitForWithTimeout(
        'data view selector to include a newly created dataview',
        5000,
        async () => {
          const dataViewTitle = await PageObjects.discover.getCurrentlySelectedDataView();
          // data view editor will add wildcard symbol by default
          // so we need to include it in our original title when comparing
          return dataViewTitle === `${dataViewToCreate}*`;
        }
      );
    });
  });
}
