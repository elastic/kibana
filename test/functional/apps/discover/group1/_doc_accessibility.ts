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
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const { common, header, timePicker } = getPageObjects(['common', 'header', 'timePicker']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover doc accessibility', () => {
    before(async () => {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('should give focus to the first tab link when Tab is pressed', async () => {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[0].click();
      await header.waitUntilLoadingHasFinished();
      await browser.pressKeys(browser.keys.TAB);
      await browser.pressKeys(browser.keys.SPACE);
      await browser.pressKeys(browser.keys.TAB);
      const tableTab = await testSubjects.find('docViewerTab-doc_view_table');
      const activeElement = await find.activeElement();
      expect(await tableTab.getAttribute('data-test-subj')).to.eql(
        await activeElement.getAttribute('data-test-subj')
      );
    });
  });
}
