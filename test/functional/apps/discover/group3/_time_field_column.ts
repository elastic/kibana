/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const SEARCH_NO_COLUMNS = 'searchNoColumns';
const SEARCH_WITH_ONLY_TIMESTAMP = 'searchWithOnlyTimestampColumn';
const SEARCH_WITH_SELECTED_COLUMNS = 'searchWithSelectedColumns';
const SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP = 'searchWithSelectedColumnsAndTimestamp';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
    'header',
  ]);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const monacoEditor = getService('monacoEditor');
  const dataViews = getService('dataViews');
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const docTable = getService('docTable');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    hideAnnouncements: true,
  };

  describe('discover time field column', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    async function checkInitialColumns({
      hasTimeField,
      hideTimeFieldColumnSetting,
      savedSearchSuffix,
      isTextBased,
    }: {
      hasTimeField: boolean;
      hideTimeFieldColumnSetting: boolean;
      savedSearchSuffix: string;
      isTextBased?: boolean;
    }) {
      // check in Discover
      expect(await dataGrid.getHeaderFields()).to.eql(
        hideTimeFieldColumnSetting || !hasTimeField ? ['Document'] : ['@timestamp', 'Document']
      );
      await PageObjects.discover.saveSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      const isTimestampUnavailableInSidebar = isTextBased && !hasTimeField;
      if (!isTimestampUnavailableInSidebar) {
        await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await retry.try(async () => {
          expect(await dataGrid.getHeaderFields()).to.eql(
            !hasTimeField
              ? ['@timestamp']
              : hideTimeFieldColumnSetting
              ? ['Document'] // legacy behaviour
              : ['@timestamp', 'Document'] // legacy behaviour
          );
        });

        await PageObjects.discover.saveSearch(
          `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}`,
          true
        );
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
        await retry.try(async () => {
          expect(await dataGrid.getHeaderFields()).to.eql(
            hideTimeFieldColumnSetting || !hasTimeField ? ['Document'] : ['@timestamp', 'Document']
          );
        });
      }

      // check in Dashboard
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField ? ['Document'] : ['@timestamp', 'Document']
        );
      });

      if (!isTimestampUnavailableInSidebar) {
        await dashboardPanelActions.removePanelByTitle(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await dashboardAddPanel.clickOpenAddPanel();
        await dashboardAddPanel.addSavedSearch(`${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}`);
        await dashboardAddPanel.closeAddPanel();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          expect(await dataGrid.getHeaderFields()).to.eql(
            !hasTimeField
              ? ['@timestamp']
              : hideTimeFieldColumnSetting
              ? ['Document'] // legacy behaviour
              : ['@timestamp', 'Document'] // legacy behaviour
          );
        });
      }
    }

    async function checkSelectedColumns({
      hasTimeField,
      hideTimeFieldColumnSetting,
      savedSearchSuffix,
      isTextBased,
    }: {
      hasTimeField: boolean;
      hideTimeFieldColumnSetting: boolean;
      savedSearchSuffix: string;
      isTextBased?: boolean;
    }) {
      // check in Discover
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField || isTextBased
            ? ['bytes', 'extension']
            : ['@timestamp', 'bytes', 'extension']
        );
      });

      await PageObjects.discover.saveSearch(`${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension', '@timestamp']);
      });

      await PageObjects.discover.saveSearch(
        `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}`,
        true
      );
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await dataGrid.clickMoveColumnLeft('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['bytes', '@timestamp', 'extension']);
      });

      await dataGrid.clickMoveColumnLeft('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      });

      await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField || isTextBased
            ? ['bytes', 'extension']
            : ['@timestamp', 'bytes', 'extension']
        );
      });

      // check in Dashboard
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(`${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`);
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField || isTextBased
            ? ['bytes', 'extension']
            : ['@timestamp', 'bytes', 'extension']
        );
      });

      await dashboardPanelActions.removePanelByTitle(
        `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(
        `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}`
      );
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension', '@timestamp']);
      });
    }

    // Add `true` to the array to test locally with non default `doc_table:hideTimeColumn` setting too. I would not recommend committing with `true` as it doubles the whole test suit time.
    [false].forEach((hideTimeFieldColumnSetting) => {
      const savedSearchSuffix = hideTimeFieldColumnSetting ? 'HideTimeColumn' : 'ShowTimeColumn';

      describe(`should${hideTimeFieldColumnSetting ? ' not' : ''} add a time field column`, () => {
        beforeEach(async () => {
          await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
          await kibanaServer.uiSettings.update({
            ...defaultSettings,
            'doc_table:legacy': false,
            'doc_table:hideTimeColumn': hideTimeFieldColumnSetting,
          });
          await PageObjects.common.navigateToApp('discover');
          await PageObjects.discover.waitUntilSearchingHasFinished();
        });

        describe('data view mode', () => {
          describe('time-based data view', () => {
            it('should render initial columns correctly', async () => {
              await checkInitialColumns({
                hasTimeField: true,
                hideTimeFieldColumnSetting,
                savedSearchSuffix,
              });
            });

            it('should render selected columns correctly', async () => {
              await checkSelectedColumns({
                hasTimeField: true,
                hideTimeFieldColumnSetting,
                savedSearchSuffix,
              });
            });
          });

          describe('without a time field', () => {
            beforeEach(async () => {
              await dataViews.createFromSearchBar({
                name: 'logs*',
                adHoc: true,
                hasTimeField: false,
              });
              await PageObjects.discover.waitUntilSearchingHasFinished();
              await PageObjects.header.waitUntilLoadingHasFinished();
            });

            it('should render initial columns correctly', async () => {
              await checkInitialColumns({
                hasTimeField: false,
                hideTimeFieldColumnSetting,
                savedSearchSuffix: savedSearchSuffix + '-',
              });
            });

            it('should render selected columns correctly', async () => {
              await checkSelectedColumns({
                hasTimeField: false,
                hideTimeFieldColumnSetting,
                savedSearchSuffix: savedSearchSuffix + '-',
              });
            });
          });
        });

        describe('ESQL mode', () => {
          it('should render initial columns correctly', async () => {
            await PageObjects.discover.selectTextBaseLang();

            await checkInitialColumns({
              hasTimeField: true,
              hideTimeFieldColumnSetting,
              savedSearchSuffix: savedSearchSuffix + 'ESQL',
              isTextBased: true,
            });
          });

          it('should render initial columns correctly when no time field', async () => {
            await PageObjects.discover.selectTextBaseLang();
            await monacoEditor.setCodeEditorValue('from logstash-* | limit 10 | drop @timestamp');
            await testSubjects.click('querySubmitButton');
            await PageObjects.header.waitUntilLoadingHasFinished();

            await checkInitialColumns({
              hasTimeField: false,
              hideTimeFieldColumnSetting,
              savedSearchSuffix: savedSearchSuffix + 'ESQLdrop',
              isTextBased: true,
            });
          });

          it('should render selected columns correctly', async () => {
            await PageObjects.discover.selectTextBaseLang();

            await checkSelectedColumns({
              hasTimeField: true,
              hideTimeFieldColumnSetting,
              savedSearchSuffix: savedSearchSuffix + 'ESQL',
              isTextBased: true,
            });
          });
        });

        // These tests are skipped as they take a lot of time to run. Temporary unskip them to validate current functionality if necessary.
        describe.skip('legacy table', () => {
          beforeEach(async () => {
            await kibanaServer.uiSettings.update({
              ...defaultSettings,
              'doc_table:hideTimeColumn': hideTimeFieldColumnSetting,
              'doc_table:legacy': true,
            });
            await PageObjects.common.navigateToApp('discover');
            await PageObjects.discover.waitUntilSearchingHasFinished();
          });

          it('should render initial columns correctly', async () => {
            // no columns
            await PageObjects.discover.loadSavedSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
            );

            await PageObjects.discover.loadSavedSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}-`);
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(['Document']);

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_NO_COLUMNS}${savedSearchSuffix}ESQL`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
            );

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_NO_COLUMNS}${savedSearchSuffix}ESQLdrop`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
            );

            // only @timestamp is selected
            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting ? ['@timestamp'] : ['@timestamp', '@timestamp']
            );

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}-`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(['@timestamp']);

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}ESQL`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting ? ['@timestamp'] : ['@timestamp', '@timestamp']
            );
          });

          it('should render selected columns correctly', async () => {
            // with selected columns
            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting
                ? ['bytes', 'extension']
                : ['@timestamp', 'bytes', 'extension']
            );

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}-`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(['bytes', 'extension']);

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}ESQL`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting
                ? ['bytes', 'extension']
                : ['@timestamp', 'bytes', 'extension']
            );

            // with selected columns and @timestamp
            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting
                ? ['bytes', 'extension', '@timestamp']
                : ['@timestamp', 'bytes', 'extension', '@timestamp']
            );

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}-`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(['bytes', 'extension', '@timestamp']);

            await PageObjects.discover.loadSavedSearch(
              `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}ESQL`
            );
            await PageObjects.discover.waitUntilSearchingHasFinished();
            expect(await docTable.getHeaderFields()).to.eql(
              hideTimeFieldColumnSetting
                ? ['bytes', 'extension', '@timestamp']
                : ['@timestamp', 'bytes', 'extension', '@timestamp']
            );
          });
        });
      });
    });
  });
}
