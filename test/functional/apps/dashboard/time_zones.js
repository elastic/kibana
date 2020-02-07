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

import path from 'path';
import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const pieChart = getService('pieChart');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['dashboard', 'timePicker', 'settings', 'common']);

  describe('dashboard time zones', function() {
    this.tags('smoke');

    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(
        path.join(__dirname, 'exports', 'timezonetest_6_2_4.json')
      );
      await PageObjects.settings.checkImportSucceeded();
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
      await browser.refresh();
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
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'EST');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
      const time = await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
      expect(time.start).to.be('Apr 9, 2018 @ 22:00:00.000');
      expect(time.end).to.be('Apr 9, 2018 @ 23:00:00.000');
      await pieChart.expectPieSliceCount(4);
    });
  });
}
