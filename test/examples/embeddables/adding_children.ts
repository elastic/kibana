/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const flyout = getService('flyout');

  const toggleFilterPopover = async () => {
    const filtersHolder = await find.byClassName('euiSearchBar__filtersHolder');
    const filtersButton = await filtersHolder.findByCssSelector('button');
    await filtersButton.click();
  };

  const clickFilter = async (type: string) => {
    const list = await testSubjects.find('euiSelectableList');
    const listItems = await list.findAllByCssSelector('li');
    for (let i = 0; i < listItems.length; i++) {
      const listItem = await listItems[i].findByClassName('euiSelectableListItem__text');
      const text = await listItem.getVisibleText();
      if (text.includes(type)) {
        await listItem.click();
        await toggleFilterPopover();
        break;
      }
    }
  };

  describe.only('adding children', () => {
    before(async () => {
      await testSubjects.click('embeddablePanelExample');
    });

    it('Can add a child backed off a saved object', async () => {
      await testSubjects.click('addPanelToListContainer');
      await testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
      await toggleFilterPopover();
      await clickFilter('Todo');
      await testSubjects.click('savedObjectTitleGarbage');
      await testSubjects.moveMouseTo('euiFlyoutCloseButton');
      await flyout.ensureClosed('dashboardAddPanel');
      const tasks = await testSubjects.getVisibleTextAll('todoEmbeddableTask');
      expect(tasks).to.eql(['Goes out on Wednesdays!', 'Take the garbage out']);
    });
  });
}
