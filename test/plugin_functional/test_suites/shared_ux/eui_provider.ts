/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getPageObjects, getService }: PluginFunctionalProviderContext) {
  const lifecycle = getService('lifecycle');
  const PageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const log = getService('log');

  lifecycle.afterTestSuite.add(async () => {
    // check sessionStorage for trace of EuiProvider dev error thrown
    const [errorMessage, errorStack, pageHref, pageTitle] = await Promise.all([
      browser.getSessionStorageItem('dev.euiProviderWarning.message'),
      browser.getSessionStorageItem('dev.euiProviderWarning.stack'),
      browser.getSessionStorageItem('dev.euiProviderWarning.pageHref'),
      browser.getSessionStorageItem('dev.euiProviderWarning.pageTitle'),
    ]);
    if (errorMessage != null) {
      log.error(`pageTitle: ${pageTitle}`);
      log.error(`pageHref: ${pageHref}`);
      log.error(`Error: ${errorMessage}`);
      log.error(`Error stack: ${errorStack}`);
      throw new Error(`Found EuiProvider dev error on: ${pageHref}`);
    }
  });

  describe('EUI Provider Dev Warning', () => {
    it('shows error toast to developer', async () => {
      await PageObjects.common.navigateToApp('euiProviderDevWarning');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await browser.getTitle()).eql('EuiProvider test - Elastic');
      await testSubjects.existOrFail('core-chrome-euiDevProviderWarning-toast');

      // clean up to ensure test suite will pass
      await Promise.all([
        browser.removeSessionStorageItem('dev.euiProviderWarning.message'),
        browser.removeSessionStorageItem('dev.euiProviderWarning.stack'),
        browser.removeSessionStorageItem('dev.euiProviderWarning.pageHref'),
        browser.removeSessionStorageItem('dev.euiProviderWarning.pageTitle'),
      ]);
    });
  });
}
