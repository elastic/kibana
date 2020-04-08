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
  const retry = getService('retry');
  const panelActions = getService('dashboardPanelActions');

  describe('embeddable title', () => {
    before(async () => {
      await testSubjects.click('inputOutputEmbeddableSection');
    });

    it('input.title shows initially', async () => {
      const text = await testSubjects.getVisibleText('embeddablePanelTitle');
      expect(text).to.be('Hi there!');
    });

    it('input.title can be hidden', async () => {
      await panelActions.openContextMenu();
      await panelActions.clickCustomizePanelTitle();
      await panelActions.clickHidePanelTitleToggle();
      await panelActions.clickSaveCustomPanelTitle();

      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('embeddablePanelTitle');
        expect(text).to.be('');
      });
    });

    it('input.title can be unhidden', async () => {
      await panelActions.openContextMenu();
      await panelActions.clickCustomizePanelTitle();
      await panelActions.clickHidePanelTitleToggle();
      await panelActions.clickSaveCustomPanelTitle();

      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('embeddablePanelTitle');
        expect(text).to.be('Hi there!');
      });
    });

    it('input.title can be set to something custom', async () => {
      await panelActions.setCustomPanelTitle('Custom', 'Hi there!');

      const text = await testSubjects.getVisibleText('embeddablePanelTitle');
      expect(text).to.be('Custom');
    });

    it('input.title can be reset', async () => {
      await panelActions.resetCustomPanelTitle();

      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('embeddablePanelTitle');
        expect(text).to.be('Hi there!');
      });
    });
  });
}
