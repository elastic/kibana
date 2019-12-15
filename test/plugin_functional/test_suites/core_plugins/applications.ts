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
import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);

  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  const loadingScreenNotShown = async () =>
    expect(await testSubjects.exists('kbnLoadingMessage')).to.be(false);

  const loadingScreenShown = () => testSubjects.existOrFail('kbnLoadingMessage');

  const getKibanaUrl = (pathname?: string, search?: string) =>
    url.format({
      protocol: 'http:',
      hostname: process.env.TEST_KIBANA_HOST || 'localhost',
      port: process.env.TEST_KIBANA_PORT || '5620',
      pathname,
      search,
    });

  describe('ui applications', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToApp('foo');
    });

    it('starts on home page', async () => {
      await testSubjects.existOrFail('fooAppHome');
    });

    it('navigates to its own pages', async () => {
      // Go to page A
      await testSubjects.click('fooNavPageA');
      expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/foo/page-a'));
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppPageA');

      // Go to home page
      await testSubjects.click('fooNavHome');
      expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/foo/'));
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppHome');
    });

    it('can use the back button to navigate within an app', async () => {
      await browser.goBack();
      expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/foo/page-a'));
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppPageA');
    });

    it('navigates to other apps', async () => {
      await testSubjects.click('fooNavBarPageB');
      await loadingScreenNotShown();
      await testSubjects.existOrFail('barAppPageB');
      expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/bar/page-b', 'query=here'));
    });

    it('preserves query parameters across apps', async () => {
      const querySpan = await testSubjects.find('barAppPageBQuery');
      expect(await querySpan.getVisibleText()).to.eql(`[["query","here"]]`);
    });

    it('can use the back button to navigate back to previous app', async () => {
      await browser.goBack();
      expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/foo/page-a'));
      await loadingScreenNotShown();
      await testSubjects.existOrFail('fooAppPageA');
    });

    it('chromeless applications are not visible in apps list', async () => {
      expect(await appsMenu.linkExists('Chromeless')).to.be(false);
    });

    it('navigating to chromeless application hides chrome', async () => {
      await PageObjects.common.navigateToApp('chromeless');
      await loadingScreenNotShown();
      expect(await testSubjects.exists('headerGlobalNav')).to.be(false);
    });

    it('navigating away from chromeless application shows chrome', async () => {
      await PageObjects.common.navigateToApp('foo');
      await loadingScreenNotShown();
      expect(await testSubjects.exists('headerGlobalNav')).to.be(true);
    });

    it.skip('can navigate from NP apps to legacy apps', async () => {
      await appsMenu.clickLink('Management');
      await loadingScreenShown();
      await testSubjects.existOrFail('managementNav');
    });

    it.skip('can navigate from legacy apps to NP apps', async () => {
      await appsMenu.clickLink('Foo');
      await loadingScreenShown();
      await testSubjects.existOrFail('fooAppHome');
    });
  });
}
