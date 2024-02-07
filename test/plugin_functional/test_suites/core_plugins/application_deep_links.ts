/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObject }: PluginFunctionalProviderContext) {
  const common = getPageObject('common');
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  const clickAppLink = async (app: string) => {
    const appLink = `dlNav${app}`;
    if (!(await testSubjects.exists(appLink))) {
      log.debug(`App ${app} not found on side nav`);
    }
    await testSubjects.click(appLink);
  };

  const loadingScreenNotShown = async () =>
    expect(await testSubjects.exists('kbnLoadingMessage')).to.be(false);

  const checkAppVisible = async (app: string) => {
    const appContainer = `dlApp${app}`;
    await testSubjects.existOrFail(appContainer);
  };

  describe('application deep links navigation', function describeDeepLinksTests() {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await common.navigateToApp('dl');
    });

    it('should start on home page', async () => {
      await checkAppVisible('Home');
    });

    it('should navigate to page A when navlink is clicked', async () => {
      await clickAppLink('PageA');
      await browser.waitForUrlToBe('/app/dl/page-a');
      await loadingScreenNotShown();
      await checkAppVisible('PageA');
    });

    it('should be able to use the back button to navigate back to previous deep link', async () => {
      await browser.goBack();
      await browser.waitForUrlToBe('/app/dl/home');
      await loadingScreenNotShown();
      await checkAppVisible('Home');
    });

    it('should navigate to nested page B when navlink is clicked', async () => {
      await clickAppLink('DeepPageB');
      await browser.waitForUrlToBe('/app/dl/page-b');
      await loadingScreenNotShown();
      await checkAppVisible('PageB');
    });

    it('should navigate to Home when navlink is clicked inside the defined category group', async () => {
      await clickAppLink('Home');
      await browser.waitForUrlToBe('/app/dl/home');
      await loadingScreenNotShown();
      await checkAppVisible('Home');
    });

    it('should navigate to nested page B using navigateToApp path', async () => {
      await clickAppLink('DeepPageB');
      await browser.waitForUrlToBe('/app/dl/page-b');
      await loadingScreenNotShown();
      await checkAppVisible('PageB');
    });

    it('should navigate to nested page A using navigateToApp deepLinkId', async () => {
      await clickAppLink('DeepPageAById');
      await browser.waitForUrlToBe('/app/dl/page-a');
      await loadingScreenNotShown();
      await checkAppVisible('PageA');
    });

    it('should not display hidden deep links', async () => {
      expect(await appsMenu.linkExists('DL Section One')).to.be(false);
      expect(await appsMenu.linkExists('DL Page C')).to.be(false);
    });
  });
}
