/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const { common, discover, timePicker, header } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
  ]);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');

  describe('discover flyouts', function () {
    async function isLensEditFlyoutOpen() {
      return await testSubjects.exists('lnsChartSwitchPopover');
    }

    async function openLensEditFlyout() {
      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      await retry.waitFor('flyout', async () => {
        return await isLensEditFlyoutOpen();
      });
    }

    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async function () {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('doc viewer flyout should get dismissed on opening ESQL docs flyout', async function () {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      await esql.openQuickReferenceFlyout();
      expect(await dataGrid.isShowingDocViewer()).to.be(false);
      expect(await esql.isOpenQuickReferenceFlyout()).to.be(true);
    });

    it('doc viewer flyout should get dismissed on opening Lens Edit flyout', async function () {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      await openLensEditFlyout();
      expect(await dataGrid.isShowingDocViewer()).to.be(false);
      expect(await isLensEditFlyoutOpen()).to.be(true);
    });

    it('ESQL docs flyout should get dismissed on opening doc viewer flyout', async function () {
      await esql.openQuickReferenceFlyout();
      expect(await esql.isOpenQuickReferenceFlyout()).to.be(true);
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      expect(await esql.isOpenQuickReferenceFlyout()).to.be(false);
    });

    it('ESQL docs flyout should get dismissed on opening Lens Edit flyout', async function () {
      await esql.openQuickReferenceFlyout();
      expect(await esql.isOpenQuickReferenceFlyout()).to.be(true);
      await openLensEditFlyout();
      expect(await isLensEditFlyoutOpen()).to.be(true);
      expect(await esql.isOpenQuickReferenceFlyout()).to.be(false);
    });

    it('Lens Edit flyout should get dismissed on opening doc viewer flyout', async function () {
      await openLensEditFlyout();
      expect(await isLensEditFlyoutOpen()).to.be(true);
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      expect(await dataGrid.isShowingDocViewer()).to.be(true);
      expect(await isLensEditFlyoutOpen()).to.be(false);
    });
  });
}
