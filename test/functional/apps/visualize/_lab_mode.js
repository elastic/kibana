import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'settings']);

  describe('visualize lab mode', () => {

    it('disabling does not break loading saved searches', async () => {
      await PageObjects.common.navigateToUrl('discover', '');
      await PageObjects.discover.saveSearch('visualize_lab_mode_test');
      await PageObjects.discover.openSavedSearch();
      const hasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(hasSaved).to.be(true);

      log.info('found saved search before toggling enableLabs mode');

      // Navigate to advanced setting and disable lab mode
      await PageObjects.header.clickManagement();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.toggleAdvancedSettingCheckbox('visualize:enableLabs');

      // Expect the discover still to list that saved visualization in the open list
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.openSavedSearch();
      const stillHasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(stillHasSaved).to.be(true);
      log.info('found saved search after toggling enableLabs mode');
    });

    after(async () => {
      await PageObjects.header.clickManagement();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.clearAdvancedSettings('visualize:enableLabs');
    });

  });
}
