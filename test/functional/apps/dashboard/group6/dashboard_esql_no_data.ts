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
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const panelActions = getService('dashboardPanelActions');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects(['dashboard']);

  describe('No Data Views: Try ES|QL', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('enables user to create a dashboard with ES|QL from no-data-prompt', async () => {
      await PageObjects.dashboard.navigateToApp();

      await testSubjects.existOrFail('noDataViewsPrompt');
      await testSubjects.click('tryESQLLink');

      await PageObjects.dashboard.expectOnDashboard('New Dashboard');
      expect(await testSubjects.exists('lnsVisualizationContainer')).to.be(true);

      await panelActions.clickInlineEdit();
      const editorValue = await monacoEditor.getCodeEditorValue();
      expect(editorValue).to.eql(`FROM logs* | LIMIT 10`);
    });
  });
}
