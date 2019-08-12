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
  const PageObjects = getPageObjects(['common']);

  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('ui applications', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToApp('foo');
    });

    it('starts on home page', async () => {
      await testSubjects.existOrFail('foo-app-home');
    });

    it('navigates to its own pages', async () => {
      // Go to page A
      await testSubjects.click('foo-nav-page-a');
      expect(await browser.getCurrentUrl()).to.eql(`http://localhost:5620/app/foo/page-a`);
      await testSubjects.existOrFail('foo-app-page-a');
      // Go to home page
      await testSubjects.click('foo-nav-home');
      expect(await browser.getCurrentUrl()).to.eql(`http://localhost:5620/app/foo/`);
      await testSubjects.existOrFail('foo-app-home');
    });

    it('can use the back button to navigate within an app', async () => {
      await browser.goBack();
      expect(await browser.getCurrentUrl()).to.eql(`http://localhost:5620/app/foo/page-a`);
      await testSubjects.existOrFail('foo-app-page-a');
    });

    it('navigates to other apps', async () => {
      await testSubjects.click('foo-nav-bar-page-b');
      await testSubjects.existOrFail('bar-app-page-b');
      expect(await browser.getCurrentUrl()).to.eql(`http://localhost:5620/app/bar/page-b?query=here`);
    });

    it('preserves query parameters across apps', async () => {
      const querySpan = await testSubjects.find('bar-app-page-b-query');
      expect(await querySpan.getVisibleText()).to.eql(`[["query","here"]]`);
    });

    it('can use the back button to navigate back to previous app', async () => {
      await browser.goBack();
      expect(await browser.getCurrentUrl()).to.eql(`http://localhost:5620/app/foo/page-a`);
      await testSubjects.existOrFail('foo-app-page-a');
    });

    it('can navigate from NP apps to legacy apps', async () => {
      await appsMenu.clickLink('Management');
      await testSubjects.existOrFail('managementNav');
    });

    it('can navigate from legacy apps to NP apps', async () => {
      await appsMenu.clickLink('Foo');
      await testSubjects.existOrFail('foo-app-home');
    });
  });
}
