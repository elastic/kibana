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

  describe('discover data grid density', function () {
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

    it('should use the default density', async () => {
      await dataGrid.clickGridSettings();
      const selected = await dataGrid.getCurrentDensityValue();
      expect(selected).to.be('Compact');
    });

    it('should allow to change density', async () => {
      await dataGrid.clickGridSettings();
      await dataGrid.changeDensityValue('Normal');

      // toggle the popover
      // Right now changing the density closes the popover (see packages/kbn-unified-data-table/src/components/data_table.tsx:1144)
      // When that workaround is removed we will need to uncomment this next line
      // await dataGrid.clickGridSettings();
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentDensityValue()).to.be('Normal');
    });

    it('should persist the density selection after reloading the page', async () => {
      await dataGrid.clickGridSettings();
      await dataGrid.changeDensityValue('Expanded');
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentDensityValue()).to.be('Expanded');

      await browser.refresh();
      await discover.waitUntilSearchingHasFinished();

      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentDensityValue()).to.be('Expanded');
    });

    it('should save and revert unsaved densities properly', async () => {
      // Open saved search
      await discover.loadSavedSearch('A Saved Search');

      // Change density
      await dataGrid.clickGridSettings();
      await dataGrid.changeDensityValue('Expanded');
      await discover.saveUnsavedChanges();

      // Change density
      await dataGrid.clickGridSettings();
      await dataGrid.changeDensityValue('Normal');
      await testSubjects.existOrFail('unsavedChangesBadge');

      // Revert change
      await discover.revertUnsavedChanges();

      // Verify density reset
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentDensityValue()).to.be('Expanded');
    });
  });
}
