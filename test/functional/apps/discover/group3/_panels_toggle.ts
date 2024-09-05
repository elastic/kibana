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
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects([
    'settings',
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    hideAnnouncements: true,
  };

  describe('discover panels toggle', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    async function checkSidebarAndHistogram({
      shouldSidebarBeOpen,
      shouldHistogramBeOpen,
      isChartAvailable,
      totalHits,
    }: {
      shouldSidebarBeOpen: boolean;
      shouldHistogramBeOpen: boolean;
      isChartAvailable: boolean;
      totalHits: string;
    }) {
      expect(await PageObjects.discover.getHitCount()).to.be(totalHits);

      if (shouldSidebarBeOpen) {
        expect(await PageObjects.discover.isSidebarPanelOpen()).to.be(true);
        await testSubjects.existOrFail('unifiedFieldListSidebar__toggle-collapse');
        await testSubjects.missingOrFail('dscShowSidebarButton');
      } else {
        expect(await PageObjects.discover.isSidebarPanelOpen()).to.be(false);
        await testSubjects.missingOrFail('unifiedFieldListSidebar__toggle-collapse');
        await testSubjects.existOrFail('dscShowSidebarButton');
      }

      if (isChartAvailable) {
        expect(await PageObjects.discover.isChartVisible()).to.be(shouldHistogramBeOpen);
        if (shouldHistogramBeOpen) {
          await testSubjects.existOrFail('dscPanelsToggleInHistogram');
          await testSubjects.existOrFail('dscHideHistogramButton');

          await testSubjects.missingOrFail('dscPanelsToggleInPage');
          await testSubjects.missingOrFail('dscShowHistogramButton');
        } else {
          await testSubjects.existOrFail('dscPanelsToggleInPage');
          await testSubjects.existOrFail('dscShowHistogramButton');

          await testSubjects.missingOrFail('dscPanelsToggleInHistogram');
          await testSubjects.missingOrFail('dscHideHistogramButton');
        }
      } else {
        expect(await PageObjects.discover.isChartVisible()).to.be(false);
        await testSubjects.missingOrFail('dscPanelsToggleInHistogram');
        await testSubjects.missingOrFail('dscHideHistogramButton');
        await testSubjects.missingOrFail('dscShowHistogramButton');

        if (shouldSidebarBeOpen) {
          await testSubjects.missingOrFail('dscPanelsToggleInPage');
        } else {
          await testSubjects.existOrFail('dscPanelsToggleInPage');
        }
      }
    }

    function checkPanelsToggle({
      isChartAvailable,
      totalHits,
    }: {
      isChartAvailable: boolean;
      totalHits: string;
    }) {
      it('sidebar can be toggled', async () => {
        await checkSidebarAndHistogram({
          shouldSidebarBeOpen: true,
          shouldHistogramBeOpen: true,
          isChartAvailable,
          totalHits,
        });

        await PageObjects.discover.closeSidebar();

        await checkSidebarAndHistogram({
          shouldSidebarBeOpen: false,
          shouldHistogramBeOpen: true,
          isChartAvailable,
          totalHits,
        });

        await PageObjects.discover.openSidebar();

        await checkSidebarAndHistogram({
          shouldSidebarBeOpen: true,
          shouldHistogramBeOpen: true,
          isChartAvailable,
          totalHits,
        });
      });

      if (isChartAvailable) {
        it('histogram can be toggled', async () => {
          await checkSidebarAndHistogram({
            shouldSidebarBeOpen: true,
            shouldHistogramBeOpen: true,
            isChartAvailable,
            totalHits,
          });

          await PageObjects.discover.closeHistogramPanel();

          await checkSidebarAndHistogram({
            shouldSidebarBeOpen: true,
            shouldHistogramBeOpen: false,
            isChartAvailable,
            totalHits,
          });

          await PageObjects.discover.openHistogramPanel();

          await checkSidebarAndHistogram({
            shouldSidebarBeOpen: true,
            shouldHistogramBeOpen: true,
            isChartAvailable,
            totalHits,
          });
        });

        it('sidebar and histogram can be toggled', async () => {
          await checkSidebarAndHistogram({
            shouldSidebarBeOpen: true,
            shouldHistogramBeOpen: true,
            isChartAvailable,
            totalHits,
          });

          await PageObjects.discover.closeSidebar();
          await PageObjects.discover.closeHistogramPanel();

          await checkSidebarAndHistogram({
            shouldSidebarBeOpen: false,
            shouldHistogramBeOpen: false,
            isChartAvailable,
            totalHits,
          });

          await PageObjects.discover.openSidebar();
          await PageObjects.discover.openHistogramPanel();

          await checkSidebarAndHistogram({
            shouldSidebarBeOpen: true,
            shouldHistogramBeOpen: true,
            isChartAvailable,
            totalHits,
          });
        });
      }
    }

    describe('time based data view', function () {
      before(async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await kibanaServer.uiSettings.update(defaultSettings);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      checkPanelsToggle({ isChartAvailable: true, totalHits: '14,004' });
    });

    describe('non-time based data view', function () {
      before(async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await kibanaServer.uiSettings.update(defaultSettings);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await dataViews.createFromSearchBar({
          name: 'log*',
          adHoc: true,
          hasTimeField: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      checkPanelsToggle({ isChartAvailable: false, totalHits: '14,004' });
    });

    describe('ES|QL with histogram chart', function () {
      before(async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await kibanaServer.uiSettings.update(defaultSettings);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      checkPanelsToggle({ isChartAvailable: true, totalHits: '10' });
    });

    describe('ES|QL with aggs chart', function () {
      before(async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await kibanaServer.uiSettings.update(defaultSettings);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(
          'from logstash-* | stats avg(bytes) by extension | limit 100'
        );
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      checkPanelsToggle({ isChartAvailable: true, totalHits: '5' });
    });

    describe('ES|QL without a time field', function () {
      before(async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await kibanaServer.uiSettings.update(defaultSettings);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await dataViews.createFromSearchBar({
          name: 'log*',
          adHoc: true,
          hasTimeField: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      checkPanelsToggle({ isChartAvailable: false, totalHits: '10' });
    });
  });
}
