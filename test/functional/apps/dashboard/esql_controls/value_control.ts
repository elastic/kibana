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
  const { dashboard, timePicker, common, dashboardControls } = getPageObjects([
    'dashboard',
    'timePicker',
    'common',
    'dashboardControls',
  ]);
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const esql = getService('esql');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const browser = getService('browser');
  const comboBox = getService('comboBox');

  describe('dashboard - add a value type ES|QL control', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await dashboard.navigateToApp();
      await testSubjects.click('discard-unsaved-New-Dashboard');
    });

    it('should add an ES|QL value control', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboard.switchToEditMode();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await dashboard.waitForRenderComplete();

      await retry.try(async () => {
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });

      await esql.waitESQLEditorLoaded('InlineEditingESQLEditor');
      await retry.waitFor('control flyout to open', async () => {
        await esql.typeEsqlEditorQuery(
          'FROM logstash-* | WHERE geo.dest == ',
          'InlineEditingESQLEditor'
        );
        // Wait until suggestions are loaded
        await common.sleep(1000);
        // Create control is the first suggestion
        await browser.pressKeys(browser.keys.ENTER);

        return await testSubjects.exists('create_esql_control_flyout');
      });

      const valuesQueryEditorValue = await esql.getEsqlEditorQuery();
      expect(valuesQueryEditorValue).to.contain('FROM logstash-* | STATS BY geo.dest');

      // create the control
      await testSubjects.click('saveEsqlControlsFlyoutButton');
      await dashboard.waitForRenderComplete();

      await retry.try(async () => {
        const controlGroupVisible = await testSubjects.exists('controls-group-wrapper');
        expect(controlGroupVisible).to.be(true);
      });

      // Check Lens editor has been updated accordingly
      const editorValue = await esql.getEsqlEditorQuery();
      expect(editorValue).to.contain('FROM logstash-* | WHERE geo.dest == ?geo_dest');
    });

    it('should update the Lens chart accordingly', async () => {
      // change the table to keep only the column with the control
      await esql.setEsqlEditorQuery(
        'FROM logstash-* | WHERE geo.dest == ?geo_dest | KEEP geo.dest'
      );
      // run the query
      await testSubjects.click('ESQLEditor-run-query-button');
      await dashboard.waitForRenderComplete();

      // save the changes
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();
      // change the control value
      await comboBox.set('esqlControlValuesDropdown', 'AO');
      await dashboard.waitForRenderComplete();

      const tableContent = await testSubjects.getVisibleText('lnsTableCellContent');
      expect(tableContent).to.contain('AO');
    });

    it('should handle properly a query to retrieve the values that return more than one column', async () => {
      const firstId = (await dashboardControls.getAllControlIds())[0];
      await dashboardControls.editExistingControl(firstId);

      await esql.setEsqlEditorQuery('FROM logstash-*');
      // run the query
      await testSubjects.click('ESQLEditor-run-query-button');
      expect(await testSubjects.exists('esqlMoreThanOneColumnCallout')).to.be(true);
      await testSubjects.click('chooseColumnBtn');
      const searchInput = await testSubjects.find('selectableColumnSearch');
      await searchInput.type('geo.dest');
      const option = await find.byCssSelector('.euiSelectableListItem');
      await option.click();

      await common.sleep(1000);

      const editorValue = await esql.getEsqlEditorQuery();
      expect(editorValue).to.contain('FROM logstash-*\n| STATS BY geo.dest');
    });
  });
}
