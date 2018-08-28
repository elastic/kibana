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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'home']);

  describe('app navigation', function describeIndexTests() {

    before(async () => {
      await PageObjects.common.navigateToApp('settings');
    });

    it('should show in navigation', async () => {
      const link = await PageObjects.header.getGlobalNavigationLink('Test Plugin App');
      expect(link).not.to.be(undefined);
    });

    it('should navigate to the app', async () => {
      await PageObjects.header.clickGlobalNavigationLink('Test Plugin App');
      const pluginContent = await testSubjects.find('pluginContent');
      expect(await pluginContent.getVisibleText()).to.be('Super simple app plugin');
    });
  });

}
