/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const INDEX_NAME = 'newline';
const VALUE_WITH_NEW_LINES = "Newline!\nHere's a newline.\nHere's a newline again.";
const VALUE_WITHOUT_NEW_LINES = VALUE_WITH_NEW_LINES.replaceAll('\n', ' ');

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects([
    'settings',
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);
  const defaultSettings = { defaultIndex: 'logstash-*' };
  const security = getService('security');

  describe('discover data grid new line support', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await browser.setWindowSize(1200, 2000);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');

      await es.transport.request({
        path: `/${INDEX_NAME}/_doc`,
        method: 'POST',
        body: {
          message: VALUE_WITH_NEW_LINES,
        },
      });
    });

    after(async () => {
      await es.transport.request({
        path: `/${INDEX_NAME}`,
        method: 'DELETE',
      });

      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await dataViews.createFromSearchBar({ name: INDEX_NAME, adHoc: true, hasTimeField: false });
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should not show new lines for Document column', async () => {
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);

      const cell = await dataGrid.getCellElement(0, 2);
      const content = await cell.findByCssSelector('.unifiedDataTable__descriptionListDescription');
      expect(await content.getVisibleText()).to.be(VALUE_WITHOUT_NEW_LINES);
      expect(await content.getComputedStyle('white-space')).to.be('normal');
    });

    it('should show new lines for "message" column except for Single row height setting', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('message');
      await PageObjects.discover.waitUntilSearchingHasFinished();

      let cell = await dataGrid.getCellElement(0, 2);
      let content = await cell.findByCssSelector('.unifiedDataTable__cellValue');
      expect(await content.getVisibleText()).to.be(VALUE_WITH_NEW_LINES);
      expect(await content.getComputedStyle('white-space')).to.be('pre-wrap');

      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Custom');
      await dataGrid.changeRowHeightValue('Auto fit');
      await dataGrid.clickGridSettings();

      cell = await dataGrid.getCellElement(0, 2);
      content = await cell.findByCssSelector('.unifiedDataTable__cellValue');
      expect(await content.getVisibleText()).to.be(VALUE_WITH_NEW_LINES);
      expect(await content.getComputedStyle('white-space')).to.be('pre-wrap');

      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentRowHeightValue()).to.be('Auto fit');
      await dataGrid.changeRowHeightValue('Single');
      await dataGrid.clickGridSettings();

      cell = await dataGrid.getCellElement(0, 2);
      content = await cell.findByCssSelector('.unifiedDataTable__cellValue');
      expect(await content.getVisibleText()).to.be(VALUE_WITHOUT_NEW_LINES);
      expect(await content.getComputedStyle('white-space')).to.be('nowrap');
    });
  });
}
