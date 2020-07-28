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

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  /**
   * Common test suite for testing exception scenarious within dashboard
   */
  describe('dashboard error handling', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('dashboard/current/kibana');
      await PageObjects.common.navigateToApp('dashboard');
    });

    // wrapping into own describe to make sure new tab is cleaned up even if test failed
    // see: https://github.com/elastic/kibana/pull/67280#discussion_r430528122
    describe('recreate index pattern link works', () => {
      let tabsCount = 1;
      it('recreate index pattern link works', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('dashboard with missing index pattern');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const errorEmbeddable = await testSubjects.find('embeddableStackError');
        await (await errorEmbeddable.findByTagName('a')).click();
        await browser.switchTab(1);
        tabsCount++;
        await testSubjects.existOrFail('createIndexPatternButton');
      });

      after(async () => {
        if (tabsCount > 1) {
          await browser.closeCurrentWindow();
          await browser.switchTab(0);
        }
      });
    });
  });
}
