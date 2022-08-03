/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const config = getService('config');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultIndexPatternString = config.get('esTestCluster.ccs')
    ? 'ftr-remote:logstash-*'
    : 'logstash-*';
  const defaultSettings = {
    defaultIndex: defaultIndexPatternString,
  };
  const localArchiveDirectory = 'test/functional/fixtures/kbn_archiver/discover';
  const remoteArchiveDirectory = 'test/functional/fixtures/kbn_archiver/ccs/discover';
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : esArchiver;
  const kbnDirectory = config.get('esTestCluster.ccs')
    ? remoteArchiveDirectory
    : localArchiveDirectory;

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
      const roles = config.get('esTestCluster.ccs')
        ? ['kibana_admin', 'test_logstash_reader', 'ccs_remote_search']
        : ['kibana_admin', 'test_logstash_reader'];
      await security.testUser.setRoles(roles);
      await esNode.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['saved-search', 'index-pattern'] });
      await kibanaServer.importExport.load(kbnDirectory);
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.importExport.unload(kbnDirectory);
      await kibanaServer.savedObjects.clean({ types: ['saved-search', 'index-pattern'] });
    });

    it('allows creating a new data view', async function () {
      const dataViewToCreate = config.get('esTestCluster.ccs') ? 'ftr-remote:logstash' : 'logstash';
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
