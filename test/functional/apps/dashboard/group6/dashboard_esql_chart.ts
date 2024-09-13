/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const { dashboard, timePicker, header } = getPageObjects(['dashboard', 'timePicker', 'header']);
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard add ES|QL chart', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    it('should add an ES|QL datatable chart when the ES|QL panel action is clicked', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboard.switchToEditMode();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();

      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });

      expect(await testSubjects.exists('lnsDataTable')).to.be(true);
    });

    it('should remove the panel if cancel button is clicked', async () => {
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();
      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(0);
      });
    });

    it('should be able to edit the query and render another chart', async () => {
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboardAddPanel.expectEditorMenuClosed();
      await dashboard.waitForRenderComplete();

      await monacoEditor.setCodeEditorValue('from logstash-* | stats maxB = max(bytes)');
      await testSubjects.click('TextBasedLangEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      await testSubjects.click('applyFlyoutButton');
      expect(await testSubjects.exists('mtrVis')).to.be(true);
    });
  });
}
