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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'settings']);

  // Flaky: https://github.com/elastic/kibana/issues/19743
  describe('visualize lab mode', () => {
    it('disabling does not break loading saved searches', async () => {
      await PageObjects.common.navigateToUrl('discover', '');
      await PageObjects.discover.saveSearch('visualize_lab_mode_test');
      await PageObjects.discover.openLoadSavedSearchPanel();
      const hasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(hasSaved).to.be(true);
      await PageObjects.discover.closeLoadSaveSearchPanel();

      log.info('found saved search before toggling enableLabs mode');

      // Navigate to advanced setting and disable lab mode
      await PageObjects.header.clickManagement();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.toggleAdvancedSettingCheckbox('visualize:enableLabs');

      // Expect the discover still to list that saved visualization in the open list
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.openLoadSavedSearchPanel();
      const stillHasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(stillHasSaved).to.be(true);
      log.info('found saved search after toggling enableLabs mode');
    });

    after(async () => {
      await PageObjects.discover.closeLoadSaveSearchPanel();
      await PageObjects.header.clickManagement();
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.clearAdvancedSettings('visualize:enableLabs');
    });
  });
}
