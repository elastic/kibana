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
import { PluginFunctionalProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('custom doc views', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('should show custom doc views', async () => {
      await testSubjects.click('docTableExpandToggleColumn');
      const angularTab = await find.byButtonText('Angular doc view');
      const reactTab = await find.byButtonText('React doc view');
      expect(await angularTab.isDisplayed()).to.be(true);
      expect(await reactTab.isDisplayed()).to.be(true);
    });

    it('should render angular doc view', async () => {
      const angularTab = await find.byButtonText('Angular doc view');
      await angularTab.click();
      const angularContent = await testSubjects.find('angular-docview');
      expect(await angularContent.getVisibleText()).to.be('logstash-2015.09.22');
    });

    it('should render react doc view', async () => {
      const reactTab = await find.byButtonText('React doc view');
      await reactTab.click();
      const reactContent = await testSubjects.find('react-docview');
      expect(await reactContent.getVisibleText()).to.be('logstash-2015.09.22');
    });
  });
}
