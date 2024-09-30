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
  const { dashboard } = getPageObjects(['dashboard']);

  describe('dashboard from esql button on no-data-prompt', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('enables user to create a dashboard with ES|QL from no-data-prompt', async () => {
      await dashboard.navigateToApp();

      await testSubjects.existOrFail('noDataViewsPrompt');
      await testSubjects.click('tryESQLLink');

      // ensure we have landed on Discover
      await testSubjects.existOrFail('switch-to-dataviews'); // "Switch to Classic" app menu button
      await testSubjects.existOrFail('discoverNewButton');
      await testSubjects.existOrFail('discoverOpenButton');

      const codeEditor = await testSubjects.find('kibanaCodeEditor');
      expect(await codeEditor.getAttribute('innerText')).to.contain('FROM logs* | LIMIT 10');
    });
  });
}
