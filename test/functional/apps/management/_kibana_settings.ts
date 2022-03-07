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
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common', 'dashboard', 'timePicker', 'header']);

  describe('kibana settings', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.createIndexPattern('logstash-*');
      await PageObjects.settings.navigateTo();
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.removeLogstashIndexPatternIfExist();
    });

    it('should allow setting advanced settings', async function () {
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
      const advancedSetting = await PageObjects.settings.getAdvancedSettings('dateFormat:tz');
      expect(advancedSetting).to.be('America/Phoenix');
    });

    describe('state:storeInSessionStorage', () => {
      async function getStateFromUrl() {
        const currentUrl = await browser.getCurrentUrl();
        const match = currentUrl.match(/(.*)?_g=(.*)/);
        if (match) return match[2];
        throw new Error('State in url is missing or malformed: ' + currentUrl);
      }

      it('defaults to null', async () => {
        await PageObjects.settings.clickKibanaSettings();
        const storeInSessionStorage = await PageObjects.settings.getAdvancedSettingCheckbox(
          'state:storeInSessionStorage'
        );
        expect(storeInSessionStorage).to.be(null);
      });

      it('when false, dashboard state is unhashed', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        const globalState = await getStateFromUrl();

        // We don't have to be exact, just need to ensure it's greater than when the hashed variation is being used,
        // which is less than 20 characters.
        expect(globalState.length).to.be.greaterThan(20);
      });

      it('setting to true change is preserved', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.toggleAdvancedSettingCheckbox('state:storeInSessionStorage');
        const storeInSessionStorage = await PageObjects.settings.getAdvancedSettingCheckbox(
          'state:storeInSessionStorage'
        );
        expect(storeInSessionStorage).to.be('true');
      });

      it('when true, dashboard state is hashed', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        const globalState = await getStateFromUrl();

        // We don't have to be exact, just need to ensure it's less than the unhashed version, which will be
        // greater than 20 characters with the default state plus a time.
        expect(globalState.length).to.be.lessThan(20);
      });

      it("changing 'state:storeInSessionStorage' also takes effect without full page reload", async () => {
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.header.clickStackManagement();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.toggleAdvancedSettingCheckbox('state:storeInSessionStorage');
        await PageObjects.header.clickDashboard();
        const globalState = await getStateFromUrl();
        // We don't have to be exact, just need to ensure it's greater than when the hashed variation is being used,
        // which is less than 20 characters.
        expect(globalState.length).to.be.greaterThan(20);
      });
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
      await browser.refresh();
    });
  });
}
