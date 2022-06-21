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
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover accessibility', () => {
    before(async () => {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('should give focus to the saved search title h1 on navigate', async () => {
      const titleElement = await testSubjects.find('discoverSavedSearchTitle');
      const activeElement = await find.activeElement();
      expect(await titleElement.getAttribute('data-test-subj')).to.eql(
        await activeElement.getAttribute('data-test-subj')
      );
    });

    it('should give focus to the data view switch link when Tab is pressed', async () => {
      await browser.pressKeys(browser.keys.TAB);
      const dataViewSwitchLink = await testSubjects.find('discover-dataView-switch-link');
      const activeElement = await find.activeElement();
      expect(await dataViewSwitchLink.getAttribute('data-test-subj')).to.eql(
        await activeElement.getAttribute('data-test-subj')
      );
    });
  });
}
