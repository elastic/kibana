/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '../../services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, dashboard, settings, timePicker, visChart } = getPageObjects([
    'common',
    'dashboard',
    'settings',
    'timePicker',
    'visChart',
  ]);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const fieldName = 'clientip';
  const deployment = getService('deployment');

  const clickFieldAndCheckUrl = async (fieldLink: WebElementWrapper) => {
    const fieldValue = await fieldLink.getVisibleText();
    await fieldLink.click();
    const windowHandlers = await browser.getAllWindowHandles();
    expect(windowHandlers.length).to.equal(2);
    await browser.switchToWindow(windowHandlers[1]);
    const currentUrl = await browser.getCurrentUrl();
    const fieldUrl = deployment.getHostPort() + '/app/' + fieldValue;
    expect(currentUrl).to.equal(fieldUrl);
  };

  describe('Changing field formatter to Url', () => {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.navigateToApp('settings');
      await settings.clickKibanaIndexPatterns();
      await settings.clickIndexPatternLogstash();
      await settings.filterField(fieldName);
      await settings.openControlsByName(fieldName);
      await settings.toggleRow('formatRow');
      await settings.setFieldFormat('url');
      await settings.controlChangeSave();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('applied on dashboard', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('dashboard with table');
      await dashboard.waitForRenderComplete();
      const fieldLink = await visChart.getFieldLinkInVisTable(`${fieldName}: Descending`);
      await clickFieldAndCheckUrl(fieldLink);
    });

    it('applied on discover', async () => {
      await common.navigateToApp('discover');
      await timePicker.setAbsoluteRange(
        'Sep 19, 2017 @ 06:31:44.000',
        'Sep 23, 2018 @ 18:31:44.000'
      );
      await testSubjects.click('docTableExpandToggleColumn');
      const fieldLink = await testSubjects.find(`tableDocViewRow-${fieldName}-value`);
      await clickFieldAndCheckUrl(fieldLink);
    });

    afterEach(async function () {
      const windowHandlers = await browser.getAllWindowHandles();
      if (windowHandlers.length > 1) {
        await browser.closeCurrentWindow();
        await browser.switchToWindow(windowHandlers[0]);
      }
    });
  });
}
