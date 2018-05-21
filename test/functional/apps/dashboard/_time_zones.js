import path from 'path';
import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
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
      await dashboardExpect.pieSliceCount(4);
    });

    it('Changing timezone changes dashboard timestamp and shows the same data', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'EST');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('time zone test');
      const timeRange = await PageObjects.header.getPrettyDuration();
      expect(timeRange).to.be('April 9th 2018, 22:00:00.000 to April 9th 2018, 23:00:00.000');
      await dashboardExpect.pieSliceCount(4);
    });
  });
}
