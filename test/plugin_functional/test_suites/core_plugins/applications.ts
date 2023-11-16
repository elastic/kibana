/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObject }: PluginFunctionalProviderContext) {
  const common = getPageObject('common');
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const deployment = getService('deployment');
  const esArchiver = getService('esArchiver');

  const loadingScreenNotShown = async () =>
    expect(await testSubjects.exists('kbnLoadingMessage')).to.be(false);

  const getAppWrapperHeight = async () => {
    const wrapper = await find.byClassName('kbnAppWrapper');
    return (await wrapper.getSize()).height;
  };

  const navigateTo = async (path: string) =>
    await browser.navigateTo(`${deployment.getHostPort()}${path}`);

  // FLAKY: https://github.com/elastic/kibana/issues/53356
  describe.skip('ui applications', function describeIndexTests() {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await common.navigateToApp('foo');
      await common.dismissBanner();
    });

    it('starts on home page', async () => {
      await testSubjects.existOrFail('fooAppHome');
    });

    it('redirects and renders correctly regardless of trailing slash', async () => {
      await navigateTo(`/app/foo`);
      await browser.waitForUrlToBe('/app/foo/home');
      await testSubjects.existOrFail('fooAppHome');
      await navigateTo(`/app/foo/`);
      await browser.waitForUrlToBe('/app/foo/home');
      await testSubjects.existOrFail('fooAppHome');
    });

    it('navigates to its own pages', async () => {
      // Go to page A
      await testSubjects.click('fooNavPageA');
      await browser.waitForUrlToBe('/app/foo/page-a');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppPageA');

      // Go to home page
      await testSubjects.click('fooNavHome');
      await browser.waitForUrlToBe('/app/foo/home');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppHome');
    });

    it('can use the back button to navigate within an app', async () => {
      await browser.goBack();
      await browser.waitForUrlToBe('/app/foo/page-a');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppPageA');
    });

    it('navigates to app root when navlink is clicked', async () => {
      await appsMenu.clickLink('Foo', { category: 'kibana' });
      await browser.waitForUrlToBe('/app/foo/home');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppHome');
    });

    it('navigates to other apps', async () => {
      await testSubjects.click('fooNavBarPageB');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('barAppPageB');
      await browser.waitForUrlToBe('/app/bar/page-b?query=here');
    });

    it('preserves query parameters across apps', async () => {
      const querySpan = await testSubjects.find('barAppPageBQuery');
      expect(await querySpan.getVisibleText()).to.eql(`[["query","here"]]`);
    });

    it('can use the back button to navigate back to previous app', async () => {
      await browser.goBack();
      await browser.waitForUrlToBe('/app/foo/home');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppHome');
    });

    it('chromeless applications are not visible in apps list', async () => {
      expect(await appsMenu.linkExists('Chromeless')).to.be(false);
    });

    it('navigating to chromeless application hides chrome', async () => {
      await common.navigateToApp('chromeless');
      await loadingScreenNotShown();
      expect(await testSubjects.exists('headerGlobalNav')).to.be(false);

      const wrapperHeight = await getAppWrapperHeight();
      const windowHeight = (await browser.getWindowInnerSize()).height;
      expect(wrapperHeight).to.eql(windowHeight);
    });

    it('navigating away from chromeless application shows chrome', async () => {
      await common.navigateToApp('foo');
      await loadingScreenNotShown();
      expect(await testSubjects.exists('headerGlobalNav')).to.be(true);

      const wrapperHeight = await getAppWrapperHeight();
      const windowHeight = (await browser.getWindowInnerSize()).height;
      expect(wrapperHeight).to.be.below(windowHeight);
    });
  });
}
