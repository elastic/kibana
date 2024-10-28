/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getPageObjects, getService }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('EUI Provider Dev Warning', () => {
    it('shows error toast to developer', async () => {
      const pageTitle = 'EuiProvider test - Elastic';

      await PageObjects.common.navigateToApp('euiProviderDevWarning');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await browser.getTitle()).eql(pageTitle);
      await testSubjects.existOrFail('core-chrome-euiDevProviderWarning-toast');

      // check that the error has been detected and stored in session storage
      const euiProviderWarning = await browser.getSessionStorageItem('dev.euiProviderWarning');
      const {
        message: errorMessage,
        stack: errorStack,
        pageHref: errorPageHref,
        pageTitle: errorPageTitle,
      } = JSON.parse(euiProviderWarning!);
      expect(errorMessage).to.not.be.empty();
      expect(errorStack).to.not.be.empty();
      expect(errorPageHref).to.not.be.empty();
      expect(errorPageTitle).to.be(pageTitle);
    });

    after(async () => {
      // clean up to ensure test suite will pass
      await browser.removeSessionStorageItem('dev.euiProviderWarning');
    });
  });
}
