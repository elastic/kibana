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
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const find = getService('find');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'timePicker', 'discover']);

  describe('dashboard saved search embeddable', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('dashboard/current/data');
      await esArchiver.loadIfNeeded('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await filterBar.ensureFieldEditorModalIsClosed();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 22, 2015 @ 00:00:00.000',
        'Sep 23, 2015 @ 00:00:00.000'
      );
    });

    it('highlighting on filtering works', async function () {
      await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
      await filterBar.addFilter('agent', 'is', 'Mozilla');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const dataTable = await find.byCssSelector(`[data-test-subj="embeddedSavedSearchDocTable"]`);
      const $ = await dataTable.parseDomContent();
      const marks = $('mark')
        .toArray()
        .map((mark) => $(mark).text());
      expect(marks.length).to.above(10);
    });

    it('removing a filter removes highlights', async function () {
      await filterBar.removeAllFilters();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const dataTable = await find.byCssSelector(`[data-test-subj="embeddedSavedSearchDocTable"]`);
      const $ = await dataTable.parseDomContent();
      const marks = $('mark')
        .toArray()
        .map((mark) => $(mark).text());
      expect(marks.length).to.be(0);
    });
  });
}
