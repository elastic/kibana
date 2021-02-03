/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

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
