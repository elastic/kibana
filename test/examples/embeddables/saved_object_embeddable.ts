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
export default function({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('saved object embeddable', () => {
    before(async () => {
      await testSubjects.click('savedObjectSection');
      await testSubjects.click('reset-sample-data');
    });

    it('renders', async () => {
      await retry.try(async () => {
        const texts = await testSubjects.getVisibleTextAll('todoSoEmbeddableTitle');
        expect(texts).to.eql(['Garbage', 'Garbage', 'Take out the trash (By value example)']);
      });
    });

    it('can be edited when backed by saved object ', async () => {
      const header = await dashboardPanelActions.getPanelHeading('Garbage');
      await dashboardPanelActions.openContextMenu(header);
      await testSubjects.click('embeddablePanelAction-EDIT_TODO_ACTION');
      await testSubjects.setValue('titleInputField', 'Trash');
      await testSubjects.click('saveTodoEmbeddableByRef');

      await retry.try(async () => {
        const texts = await testSubjects.getVisibleTextAll('todoSoEmbeddableTitle');
        expect(texts).to.eql(['Trash', 'Garbage', 'Take out the trash (By value example)']);
      });
    });

    it('can be edited when not backed by saved object', async () => {
      const header = await dashboardPanelActions.getPanelHeading(
        'Take out the trash (By value example)'
      );
      await dashboardPanelActions.openContextMenu(header);
      await testSubjects.click('embeddablePanelAction-EDIT_TODO_ACTION');
      await testSubjects.setValue('titleInputField', 'Junk');
      await testSubjects.click('saveTodoEmbeddableByValue');

      await retry.try(async () => {
        const texts = await testSubjects.getVisibleTextAll('todoSoEmbeddableTitle');
        expect(texts).to.eql(['Trash', 'Garbage', 'Junk']);
      });

      const url = await browser.getCurrentUrl();
      await browser.get(url.toString(), true);

      await retry.try(async () => {
        const texts2 = await testSubjects.getVisibleTextAll('todoSoEmbeddableTitle');
        expect(texts2).to.eql(['Trash', 'Trash', 'Take out the trash (By value example)']);
      });
    });
  });
}
