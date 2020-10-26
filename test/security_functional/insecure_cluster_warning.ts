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

import { FtrProviderContext } from 'test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  describe('Insecure Cluster Warning', () => {
    before(async () => {
      await pageObjects.common.navigateToApp('home');
      await browser.setLocalStorageItem('insecureClusterWarningVisibility', '');
      // starting without user data
      await esArchiver.unload('hamlet');
    });

    after(async () => {
      await esArchiver.unload('hamlet');
    });

    describe('without user data', () => {
      before(async () => {
        await browser.setLocalStorageItem('insecureClusterWarningVisibility', '');
        await esArchiver.unload('hamlet');
      });

      it('should not warn when the cluster contains no user data', async () => {
        await browser.setLocalStorageItem(
          'insecureClusterWarningVisibility',
          JSON.stringify({ show: false })
        );
        await pageObjects.common.navigateToApp('home');
        await testSubjects.missingOrFail('insecureClusterDefaultAlertText');
      });
    });

    describe('with user data', () => {
      before(async () => {
        await pageObjects.common.navigateToApp('home');
        await browser.setLocalStorageItem('insecureClusterWarningVisibility', '');
        await esArchiver.load('hamlet');
      });

      after(async () => {
        await esArchiver.unload('hamlet');
      });

      it('should warn about an insecure cluster, and hide when dismissed', async () => {
        await pageObjects.common.navigateToApp('home');
        await testSubjects.existOrFail('insecureClusterDefaultAlertText');

        await testSubjects.click('defaultDismissAlertButton');

        await testSubjects.missingOrFail('insecureClusterDefaultAlertText');
      });

      it('should not warn when local storage is configured to hide', async () => {
        await browser.setLocalStorageItem(
          'insecureClusterWarningVisibility',
          JSON.stringify({ show: false })
        );
        await pageObjects.common.navigateToApp('home');
        await testSubjects.missingOrFail('insecureClusterDefaultAlertText');
      });
    });
  });
}
