/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');
  const retry = getService('retry');

  describe('creating and adding children', () => {
    before(async () => {
      await testSubjects.click('embeddablePanelExample');
    });

    it('Can create a new child', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_ADD_PANEL');

      // this seem like an overkill, but clicking this button which opens context menu was flaky
      await testSubjects.waitForEnabled('createNew');
      await retry.waitFor('createNew popover opened', async () => {
        await testSubjects.click('createNew');
        return await testSubjects.exists('createNew-TODO_EMBEDDABLE');
      });
      await testSubjects.click('createNew-TODO_EMBEDDABLE');

      await testSubjects.setValue('taskInputField', 'new task');
      await testSubjects.click('createTodoEmbeddable');
      const tasks = await testSubjects.getVisibleTextAll('todoEmbeddableTask');
      expect(tasks).to.eql(['Goes out on Wednesdays!', 'new task']);
    });

    it('Can add a child backed off a saved object', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_ADD_PANEL');
      await testSubjects.waitForDeleted('savedObjectFinderLoadingIndicator');
      await testSubjects.click('savedObjectTitleGarbage');
      await testSubjects.moveMouseTo('euiFlyoutCloseButton');
      await flyout.ensureClosed('dashboardAddPanel');
      const tasks = await testSubjects.getVisibleTextAll('todoEmbeddableTask');
      expect(tasks).to.eql(['Goes out on Wednesdays!', 'new task', 'Take the garbage out']);
    });
  });
}
