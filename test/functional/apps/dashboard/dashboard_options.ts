/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('dashboard data-shared attributes', () => {
    let originalTitles: string[] = [];

    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
      originalTitles = await PageObjects.dashboard.getPanelTitles();
    });

    it('should be able to hide all panel titles', async () => {
      await PageObjects.dashboard.checkHideTitle();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql('');
      });
    });

    it('should be able to unhide all panel titles', async () => {
      await PageObjects.dashboard.checkHideTitle();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql(originalTitles[0]);
      });
    });
  });
}
