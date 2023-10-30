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
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = { defaultIndex: 'logstash-*' };
  const security = getService('security');

  describe('discover data grid row height', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await browser.setWindowSize(1200, 2000);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should use the default row height', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);

      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Custom');
    });

    it('should allow to change row height', async () => {
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Custom');

      await dataGrid.changeRowHeightValue('Single');

      // toggle the popover
      await dataGrid.clickGridSettings();
      await dataGrid.clickGridSettings();

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Single');

      // we hide "Reset to default" action in Discover
      await testSubjects.missingOrFail('resetDisplaySelector');

      await dataGrid.changeRowHeightValue('Custom');

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Custom');

      await testSubjects.missingOrFail('resetDisplaySelector');

      await dataGrid.changeRowHeightValue('Auto fit');

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Auto fit');
    });

    it('should persist the selection after reloading the page', async () => {
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Auto fit');

      await dataGrid.changeRowHeightValue('Single');

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Single');

      await browser.refresh();

      await PageObjects.discover.waitUntilSearchingHasFinished();
      await dataGrid.clickGridSettings();

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Single');
    });
  });
}
