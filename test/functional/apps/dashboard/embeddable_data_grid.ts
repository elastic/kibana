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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker', 'discover']);

  describe('dashboard embeddable data grid', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('dashboard/current/data');
      await esArchiver.loadIfNeeded('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
        'doc_table:legacy': false,
      });
      await PageObjects.common.navigateToApp('dashboard');
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setDefaultDataRange();
    });

    describe('saved search filters', function () {
      it('are added when a cell filter is clicked', async function () {
        await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
        await find.clickByCssSelector(`[role="gridcell"]:nth-child(2)`);
        await find.clickByCssSelector(`[data-test-subj="filterOutButton"]`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await find.clickByCssSelector(`[role="gridcell"]:nth-child(2)`);
        await find.clickByCssSelector(`[data-test-subj="filterForButton"]`);
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(2);
      });
    });
  });
}
