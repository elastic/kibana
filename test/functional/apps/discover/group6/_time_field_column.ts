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

const SEARCH_NO_COLUMNS = 'searchNoColumns';
const SEARCH_WITH_ONLY_TIMESTAMP = 'searchWithOnlyTimestampColumn';
const SEARCH_WITH_SELECTED_COLUMNS = 'searchWithSelectedColumns';
const SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP = 'searchWithSelectedColumnsAndTimestamp';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const { common, discover, timePicker, dashboard, unifiedFieldList, header } = getPageObjects([
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
      isEsqlMode,
    }: {
      hasTimeField: boolean;
      hideTimeFieldColumnSetting: boolean;
      savedSearchSuffix: string;
      isEsqlMode?: boolean;
    }) {
      // check in Discover
      expect(await dataGrid.getHeaderFields()).to.eql(
        hideTimeFieldColumnSetting || !hasTimeField ? ['Summary'] : ['@timestamp', 'Summary']
      );
      await discover.saveSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
      await discover.waitUntilSearchingHasFinished();

      const isTimestampUnavailableInSidebar = isEsqlMode && !hasTimeField;
      if (!isTimestampUnavailableInSidebar) {
        await unifiedFieldList.clickFieldListItemAdd('@timestamp');
        await discover.waitUntilSearchingHasFinished();
        await retry.try(async () => {
          expect(await dataGrid.getHeaderFields()).to.eql(
            !hasTimeField
              ? ['@timestamp']
              : hideTimeFieldColumnSetting
              ? ['Summary'] // legacy behaviour
              : ['@timestamp', 'Summary'] // legacy behaviour
          );
        });

        await discover.saveSearch(`${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}`, true);
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.clickFieldListItemRemove('@timestamp');
        await retry.try(async () => {
          expect(await dataGrid.getHeaderFields()).to.eql(
            hideTimeFieldColumnSetting || !hasTimeField ? ['Summary'] : ['@timestamp', 'Summary']
          );
        });
      }

      // check in Dashboard
      await common.navigateToApp('dashboard');
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
      await dashboardAddPanel.closeAddPanel();
      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField ? ['Summary'] : ['@timestamp', 'Summary']
        );
      });

      if (!isTimestampUnavailableInSidebar) {
        await dashboardPanelActions.removePanelByTitle(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
        await header.waitUntilLoadingHasFinished();
        await dashboardAddPanel.clickOpenAddPanel();
        await dashboardAddPanel.addSavedSearch(`${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}`);
        await dashboardAddPanel.closeAddPanel();
        await header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          expect(await dataGrid.getHeaderFields()).to.eql(
            !hasTimeField
              ? ['@timestamp']
              : hideTimeFieldColumnSetting
              ? ['Summary'] // legacy behaviour
              : ['@timestamp', 'Summary'] // legacy behaviour
          );
        });
      }
    }

    async function checkSelectedColumns({
      hasTimeField,
      hideTimeFieldColumnSetting,
      savedSearchSuffix,
      isEsqlMode,
    }: {
      hasTimeField: boolean;
      hideTimeFieldColumnSetting: boolean;
      savedSearchSuffix: string;
      isEsqlMode?: boolean;
    }) {
      // check in Discover
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await unifiedFieldList.clickFieldListItemAdd('extension');

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField || isEsqlMode
            ? ['bytes', 'extension']
            : ['@timestamp', 'bytes', 'extension']
        );
      });

      await discover.saveSearch(`${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`);
      await discover.waitUntilSearchingHasFinished();

      await unifiedFieldList.clickFieldListItemAdd('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension', '@timestamp']);
      });

      await discover.saveSearch(
        `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}`,
        true
      );
      await discover.waitUntilSearchingHasFinished();

      await dataGrid.clickMoveColumnLeft('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['bytes', '@timestamp', 'extension']);
      });

      await dataGrid.clickMoveColumnLeft('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      });

      await unifiedFieldList.clickFieldListItemRemove('@timestamp');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField || isEsqlMode
            ? ['bytes', 'extension']
            : ['@timestamp', 'bytes', 'extension']
        );
      });

      // check in Dashboard
      await common.navigateToApp('dashboard');
      await dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(`${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`);
      await dashboardAddPanel.closeAddPanel();
      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(
          hideTimeFieldColumnSetting || !hasTimeField || isEsqlMode
            ? ['bytes', 'extension']
            : ['@timestamp', 'bytes', 'extension']
        );
      });

      await dashboardPanelActions.removePanelByTitle(
        `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`
      );
      await header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.addSavedSearch(
        `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}`
      );
      await dashboardAddPanel.closeAddPanel();
      await header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension', '@timestamp']);
      });
    }

    // Add `true` to the array to test locally with non default `doc_table:hideTimeColumn` setting too. I would not recommend committing with `true` as it doubles the whole test suit time.
    [false].forEach((hideTimeFieldColumnSetting) => {
      const savedSearchSuffix = hideTimeFieldColumnSetting ? 'HideTimeColumn' : 'ShowTimeColumn';

      describe(`should${hideTimeFieldColumnSetting ? ' not' : ''} add a time field column`, () => {
        beforeEach(async () => {
          await timePicker.setDefaultAbsoluteRangeViaUiSettings();
          await kibanaServer.uiSettings.update({
            ...defaultSettings,
            'doc_table:hideTimeColumn': hideTimeFieldColumnSetting,
          });
          await common.navigateToApp('discover');
          await discover.waitUntilSearchingHasFinished();
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
              await discover.waitUntilSearchingHasFinished();
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
            await discover.selectTextBaseLang();

            await checkInitialColumns({
              hasTimeField: true,
              hideTimeFieldColumnSetting,
              savedSearchSuffix: savedSearchSuffix + 'ESQL',
              isEsqlMode: true,
            });
          });

          it('should render initial columns correctly when no time field', async () => {
            await discover.selectTextBaseLang();
            await monacoEditor.setCodeEditorValue('from logstash-* | limit 10 | drop @timestamp');
            await testSubjects.click('querySubmitButton');
            await header.waitUntilLoadingHasFinished();

            await checkInitialColumns({
              hasTimeField: false,
              hideTimeFieldColumnSetting,
              savedSearchSuffix: savedSearchSuffix + 'ESQLdrop',
              isEsqlMode: true,
            });
          });

          it('should render selected columns correctly', async () => {
            await discover.selectTextBaseLang();

            await checkSelectedColumns({
              hasTimeField: true,
              hideTimeFieldColumnSetting,
              savedSearchSuffix: savedSearchSuffix + 'ESQL',
              isEsqlMode: true,
            });
          });
        });
      });
    });
  });
}
