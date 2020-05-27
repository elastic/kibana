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
import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');

  // FLAKY: https://github.com/elastic/kibana/issues/58692
  describe.skip('creating and adding children', () => {
    before(async () => {
      await testSubjects.click('embeddablePanelExamplae');
    });

    it('Can create a new child', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_ADD_PANEL');
      await testSubjects.click('createNew');
      await testSubjects.click('createNew-TODO_EMBEDDABLE');
      await testSubjects.setValue('taskInputField', 'new task');
      await testSubjects.click('createTodoEmbeddable');
      const tasks = await testSubjects.getVisibleTextAll('todoEmbeddableTask');
      expect(tasks).to.eql(['Goes out on Wednesdays!', 'new task']);
    });

    it('Can add a child backed off a saved object', async () => {
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_ADD_PANEL');
      await testSubjects.click('savedObjectTitleGarbage');
      await testSubjects.moveMouseTo('euiFlyoutCloseButton');
      await flyout.ensureClosed('dashboardAddPanel');
      const tasks = await testSubjects.getVisibleTextAll('todoEmbeddableTask');
      expect(tasks).to.eql(['Goes out on Wednesdays!', 'new task', 'Take the garbage out']);
    });
  });
}
