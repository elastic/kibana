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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const { common, discover, timePicker } = getPageObjects(['common', 'discover', 'timePicker']);
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
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
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

      await testSubjects.missingOrFail('resetDisplaySelector');

      await dataGrid.changeRowHeightValue('Auto');

      // toggle the popover
      await dataGrid.clickGridSettings();
      await dataGrid.clickGridSettings();

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Auto');

      // we hide "Reset to default" action in Discover
      await testSubjects.missingOrFail('resetDisplaySelector');

      await dataGrid.changeRowHeightValue('Custom');

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Custom');
    });

    it('should persist the row height selection after reloading the page', async () => {
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Custom');

      await dataGrid.changeRowHeightValue('Auto');

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Auto');

      await browser.refresh();

      await discover.waitUntilSearchingHasFinished();
      await dataGrid.clickGridSettings();

      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Auto');
    });

    it('should use the default header row height', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);

      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Custom');
    });

    it('should allow to change header row height', async () => {
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Custom');

      await dataGrid.changeHeaderRowHeightValue('Auto');

      // toggle the popover
      await dataGrid.clickGridSettings();
      await dataGrid.clickGridSettings();

      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Auto');

      // we hide "Reset to default" action in Discover
      await testSubjects.missingOrFail('resetDisplaySelector');

      await dataGrid.changeHeaderRowHeightValue('Custom');

      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Custom');
    });

    it('should persist the header row height selection after reloading the page', async () => {
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Custom');

      await dataGrid.changeHeaderRowHeightValue('Auto');

      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Auto');

      await browser.refresh();

      await discover.waitUntilSearchingHasFinished();
      await dataGrid.clickGridSettings();

      expect(await dataGrid.getCurrentHeaderRowHeightValue()).to.be('Auto');
    });
  });
}
