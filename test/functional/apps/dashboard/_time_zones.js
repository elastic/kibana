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
import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const pieChart = getService('pieChart');
  const PageObjects = getPageObjects(['dashboard', 'header', 'settings', 'common']);

  describe('dashboard time zones', () => {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.settings.importFile(path.join(__dirname, 'exports', 'timezonetest_6_2_4.json'));
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
    });

    after(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'UTC');
      await PageObjects.common.navigateToApp('dashboard');
    });

    it('Exported dashboard adjusts EST time to UTC', async () => {
      const timeRange = await PageObjects.header.getPrettyDuration();
      expect(timeRange).to.be('April 10th 2018, 03:00:00.000 to April 10th 2018, 04:00:00.000');
      await pieChart.expectPieSliceCount(4);
    });

    it('Changing timezone changes dashboard timestamp and shows the same data', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'EST');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
      const timeRange = await PageObjects.header.getPrettyDuration();
      expect(timeRange).to.be('April 9th 2018, 22:00:00.000 to April 9th 2018, 23:00:00.000');
      await pieChart.expectPieSliceCount(4);
    });
  });
}
