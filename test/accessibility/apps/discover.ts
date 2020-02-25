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

import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'share', 'timePicker']);
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');

  describe('Discover', () => {
    before(async () => {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('main view', async () => {
      await a11y.testAppSnapshot();
    });

    it('Click save button', async () => {
      await PageObjects.discover.clickSaveSearchButton();
      await a11y.testAppSnapshot();
    });

    it('Save search panel', async () => {
      await PageObjects.discover.inputSavedSearchTitle('a11ySearch');
      await a11y.testAppSnapshot();
    });

    it('Confirm saved search', async () => {
      await PageObjects.discover.clickConfirmSavedSearch();
      await a11y.testAppSnapshot();
    });

    // skipping the test for new because we can't fix it right now
    it.skip('Click on new to clear the search', async () => {
      await PageObjects.discover.clickNewSearchButton();
      await a11y.testAppSnapshot();
    });

    it('Open load saved search panel', async () => {
      await PageObjects.discover.openLoadSavedSearchPanel();
      await a11y.testAppSnapshot();
      await PageObjects.discover.closeLoadSavedSearchPanel();
    });

    it('Open inspector panel', async () => {
      await inspector.open();
      await a11y.testAppSnapshot();
      await inspector.close();
    });

    it('Open add filter', async () => {
      await PageObjects.discover.openAddFilterPanel();
      await a11y.testAppSnapshot();
    });

    it('Select values for a filter', async () => {
      await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
      await a11y.testAppSnapshot();
    });

    it('Load a new search from the panel', async () => {
      await PageObjects.discover.clickSaveSearchButton();
      await PageObjects.discover.inputSavedSearchTitle('filterSearch');
      await PageObjects.discover.clickConfirmSavedSearch();
      await PageObjects.discover.openLoadSavedSearchPanel();
      await PageObjects.discover.loadSavedSearch('filterSearch');
      await a11y.testAppSnapshot();
    });

    // unable to validate on EUI pop-over
    it('click share button', async () => {
      await PageObjects.share.clickShareTopNavButton();
      await a11y.testAppSnapshot();
    });

    it('Open sidebar filter', async () => {
      await PageObjects.discover.openSidebarFieldFilter();
      await a11y.testAppSnapshot();
    });

    it('Close sidebar filter', async () => {
      await PageObjects.discover.closeSidebarFieldFilter();
      await a11y.testAppSnapshot();
    });
  });
}
