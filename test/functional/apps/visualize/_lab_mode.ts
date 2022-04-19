/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { VISUALIZE_ENABLE_LABS_SETTING } from '@kbn/visualizations-plugin/common/constants';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'settings', 'visualize']);

  describe('visualize lab mode', () => {
    before(async () => {
      await PageObjects.visualize.initTests();
    });
    it('disabling does not break loading saved searches', async () => {
      await PageObjects.common.navigateToUrl('discover', '', { useActualUrl: true });
      await PageObjects.discover.saveSearch('visualize_lab_mode_test');
      await PageObjects.discover.openLoadSavedSearchPanel();
      const hasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(hasSaved).to.be(true);
      await PageObjects.discover.closeLoadSaveSearchPanel();

      log.info('found saved search before toggling enableLabs mode');

      // Navigate to advanced setting and disable lab mode
      await PageObjects.header.clickStackManagement();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.toggleAdvancedSettingCheckbox(VISUALIZE_ENABLE_LABS_SETTING);

      // Expect the discover still to list that saved visualization in the open list
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.openLoadSavedSearchPanel();
      const stillHasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(stillHasSaved).to.be(true);
      log.info('found saved search after toggling enableLabs mode');
    });

    after(async () => {
      await PageObjects.discover.closeLoadSaveSearchPanel();
      await PageObjects.header.clickStackManagement();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.clearAdvancedSettings(VISUALIZE_ENABLE_LABS_SETTING);
    });
  });
}
