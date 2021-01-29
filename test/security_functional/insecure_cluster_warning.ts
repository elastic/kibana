/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
