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
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker', 'context']);

  describe('context accessibility', () => {
    before(async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
    });

    it('should navigate to the single doc view and give focus to the title h1 on navigate', async () => {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[1].click();
      const titleElement = await testSubjects.find('discoverContextAppTitle');
      const activeElement = await find.activeElement();
      expect(await titleElement.getAttribute('data-test-subj')).to.eql(
        await activeElement.getAttribute('data-test-subj')
      );
    });

    it('should give focus to the table tab link when Tab is pressed', async () => {
      await browser.pressKeys(browser.keys.TAB);
      const dataViewSwitchLink = await testSubjects.find('showQueryBarMenu');
      const activeElement = await find.activeElement();
      expect(await dataViewSwitchLink.getAttribute('data-test-subj')).to.eql(
        await activeElement.getAttribute('data-test-subj')
      );
    });
  });
}
