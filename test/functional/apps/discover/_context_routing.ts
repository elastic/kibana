/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_COLUMN_NAMES = ['name', 'value'];
const TEST_FILTER_COLUMN_NAMES = [['name', 'a']];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings', 'header']);
  const defaultSettings = { defaultIndex: 'discover-routing-*', 'doc_table:legacy': false };
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('discover routing tests', () => {
    before(async () => {
      await esArchiver.load('discover');
      // await esArchiver.loadIfNeeded('logstash_functional');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.clickFieldListItemAdd('name');
      await PageObjects.discover.clickFieldListItemAdd('value');
    });

    after(async () => {
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    it('should provide the correct routing parameter to the context view', async () => {
      // check the anchor timestamp in the context view
      await retry.waitFor('selected document timestamp matches anchor timestamp ', async () => {
        // get the timestamp of the first row
        const discoverFields = await dataGrid.getFields();
        const firstTimestamp = discoverFields[0][0];

        // navigate to the single-document view
        await dataGrid.clickRowToggle({ rowIndex: 0 });
        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        await rowActions[1].click();
        // entering the context view (contains the legacy type)
        const contextFields = await docTable.getFields();
        const anchorTimestamp = contextFields[0][0];
        return anchorTimestamp === firstTimestamp;
      });
    });

    it('should show the same documents when switching to a new anchor', async () => {
      await retry.waitFor('loaded all rows', async () => {
        return (await docTable.getRowsText()).length === 2;
      });

      expect(await browser.getCurrentUrl()).to.contain(`routing:%270%27`);

      await docTable.toggleRowExpanded({
        rowIndex: 0,
      });
      const [surroundingActionEl] = await docTable.getRowActions({
        rowIndex: 0,
      });
      await surroundingActionEl.click();

      await retry.waitFor('loaded all rows', async () => {
        return (await docTable.getRowsText()).length === 2;
      });

      expect(await browser.getCurrentUrl()).to.contain(`routing:%271%27`);
    });
  });
}
