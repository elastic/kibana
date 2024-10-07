/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const dashboardPanelActions = getService('dashboardPanelActions');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const { dashboard } = getPageObjects(['dashboard']);

  describe('Panel Actions', () => {
    before(async () => {
      await dashboard.loadSavedDashboard('few panels');
    });

    it('allows to register links into the context menu', async () => {
      await dashboardPanelActions.openContextMenu();
      const actionExists = await testSubjects.exists('embeddablePanelAction-samplePanelLink');
      if (!actionExists) {
        await dashboardPanelActions.clickContextMenuMoreItem();
      }
      const actionElement = await testSubjects.find('embeddablePanelAction-samplePanelLink');
      const actionElementTag = await actionElement.getTagName();
      expect(actionElementTag).to.be('a');
      const actionElementLink = await actionElement.getAttribute('href');
      expect(actionElementLink).to.be('https://example.com/kibana/test');
    });

    it('Sample action appears in context menu in view mode', async () => {
      await testSubjects.existOrFail('embeddablePanelAction-samplePanelAction');
    });

    it('Clicking sample action shows a flyout', async () => {
      await testSubjects.click('embeddablePanelAction-samplePanelAction');
      await testSubjects.existOrFail('samplePanelActionFlyout');
    });

    it('flyout shows the correct contents', async () => {
      await testSubjects.existOrFail('samplePanelActionTitle');
      await testSubjects.existOrFail('samplePanelActionBody');
    });

    after(async () => {
      await retry.try(async () => {
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('samplePanelActionFlyout');
      });
    });
  });
}
