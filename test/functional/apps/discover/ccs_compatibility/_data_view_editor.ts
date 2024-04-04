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
  const dataViews = getService('dataViews');
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
      await dataViews.createFromSearchBar({ name: dataViewToCreate });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dataViews.waitForSwitcherToBe(`${dataViewToCreate}*`);
    });
  });
}
