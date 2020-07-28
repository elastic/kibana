/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, dashboard, settings, timePicker, visChart } = getPageObjects([
    'common',
    'dashboard',
    'settings',
    'timePicker',
    'visChart',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const fieldName = 'clientip';

  const clickFieldAndCheckUrl = async (fieldLink: WebElementWrapper) => {
    const fieldValue = await fieldLink.getVisibleText();
    await fieldLink.click();
    const windowHandlers = await browser.getAllWindowHandles();
    expect(windowHandlers.length).to.equal(2);
    await browser.switchToWindow(windowHandlers[1]);
    const currentUrl = await browser.getCurrentUrl();
    const fieldUrl = common.getHostPort() + '/app/' + fieldValue;
    expect(currentUrl).to.equal(fieldUrl);
  };

  describe('Changing field formatter to Url', () => {
    before(async function () {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.navigateToApp('settings');
      await settings.clickKibanaIndexPatterns();
      await settings.clickIndexPatternLogstash();
      await settings.filterField(fieldName);
      await settings.openControlsByName(fieldName);
      await settings.setFieldFormat('url');
      await settings.controlChangeSave();
    });

    it('applied on dashboard', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('dashboard with everything');
      await dashboard.waitForRenderComplete();
      const fieldLink = await visChart.getFieldLinkInVisTable(`${fieldName}: Descending`, 1);
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
