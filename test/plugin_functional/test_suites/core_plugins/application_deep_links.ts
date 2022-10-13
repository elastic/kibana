/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);

  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');

  const loadingScreenNotShown = async () =>
    expect(await testSubjects.exists('kbnLoadingMessage')).to.be(false);

  const getKibanaUrl = (pathname?: string, search?: string) =>
    url.format({
      protocol: 'http:',
      hostname: process.env.TEST_KIBANA_HOST || 'localhost',
      port: process.env.TEST_KIBANA_PORT || '5620',
      pathname,
      search,
    });

  /** Use retry logic to make URL assertions less flaky */
  const waitForUrlToBe = (pathname?: string, search?: string) => {
    const expectedUrl = getKibanaUrl(pathname, search);
    return retry.waitFor(`Url to be ${expectedUrl}`, async () => {
      return (await browser.getCurrentUrl()) === expectedUrl;
    });
  };

  describe('application deep links navigation', function describeDeepLinksTests() {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await PageObjects.common.navigateToApp('dl');
    });

    it('should start on home page', async () => {
      await testSubjects.existOrFail('dlAppHome');
    });

    it('should navigate to page A when navlink is clicked', async () => {
      await appsMenu.clickLink('DL Page A');
      await waitForUrlToBe('/app/dl/page-a');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('dlAppPageA');
    });

    it('should be able to use the back button to navigate back to previous deep link', async () => {
      await browser.goBack();
      await waitForUrlToBe('/app/dl/home');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('dlAppHome');
    });

    it('should navigate to nested page B when navlink is clicked', async () => {
      await appsMenu.clickLink('DL Page B');
      await waitForUrlToBe('/app/dl/page-b');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('dlAppPageB');
    });

    it('should navigate to Home when navlink is clicked inside the defined category group', async () => {
      await appsMenu.clickLink('DL Home', { category: 'securitySolution' });
      await waitForUrlToBe('/app/dl/home');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('dlAppHome');
    });

    it('should navigate to nested page B using navigateToApp path', async () => {
      await testSubjects.click('dlNavDeepPageB');
      await waitForUrlToBe('/app/dl/page-b');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('dlAppPageB');
    });

    it('should navigate to nested page A using navigateToApp deepLinkId', async () => {
      await testSubjects.click('dlNavDeepPageAById');
      await waitForUrlToBe('/app/dl/page-a');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('dlAppPageA');
    });

    it('should not display hidden deep links', async () => {
      expect(await appsMenu.linkExists('DL Section One')).to.be(false);
      expect(await appsMenu.linkExists('DL Page C')).to.be(false);
    });
  });
}
