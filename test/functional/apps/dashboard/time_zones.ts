/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import path from 'path';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pieChart = getService('pieChart');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'dashboard',
    'timePicker',
    'settings',
    'common',
    'savedObjects',
  ]);

  describe('dashboard time zones', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', 'timezonetest_6_2_4.json')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
    });

    it('Exported dashboard adjusts EST time to UTC', async () => {
      const time = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
      expect(time.start).to.be('Apr 10, 2018 @ 03:00:00.000');
      expect(time.end).to.be('Apr 10, 2018 @ 04:00:00.000');
      await pieChart.expectPieSliceCount(4);
    });

    it('Changing timezone changes dashboard timestamp and shows the same data', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'Etc/GMT+5');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
      const time = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
      expect(time.start).to.be('Apr 9, 2018 @ 22:00:00.000');
      expect(time.end).to.be('Apr 9, 2018 @ 23:00:00.000');
      await pieChart.expectPieSliceCount(4);
    });
  });
}
