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

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('dashboard data-shared attributes', () => {
    let originalTitles = [];

    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
      originalTitles = await PageObjects.dashboard.getPanelTitles();
    });

    it('should be able to hide all panel titles', async () => {
      await PageObjects.dashboard.checkHideTitle();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql('');
      });
    });

    it('should be able to unhide all panel titles', async () => {
      await PageObjects.dashboard.checkHideTitle();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql(originalTitles[0]);
      });
    });
  });
}
