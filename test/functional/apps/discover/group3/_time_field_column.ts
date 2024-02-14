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

    [false, true].forEach((hideTimeFieldColumnSetting) => {
      const savedSearchSuffix = hideTimeFieldColumnSetting ? 'HideTimeField' : 'ShowTimeField';

      describe(`should${hideTimeFieldColumnSetting ? ' not' : ''} add a time field column`, () => {
        beforeEach(async () => {
          await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
          await kibanaServer.uiSettings.update({
            ...defaultSettings,
            'doc_table:hideTimeColumn': hideTimeFieldColumnSetting,
          });
          await PageObjects.common.navigateToApp('discover');
          await PageObjects.discover.waitUntilSearchingHasFinished();
        });

        describe('data view mode', () => {
          describe('time-based data view', () => {
            it('should render initial columns correctly', async () => {
              // check in Discover
              expect(await dataGrid.getHeaderFields()).to.eql(
                hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
              );
              await PageObjects.discover.saveSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
              await PageObjects.discover.waitUntilSearchingHasFinished();
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document'] // legacy behaviour
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
                  hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
                );
              });

              await PageObjects.common.navigateToApp('dashboard');
              await PageObjects.dashboard.clickNewDashboard();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}`);
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
                );
              });

              // check in Dashboard
              await dashboardPanelActions.removePanelByTitle(
                `${SEARCH_NO_COLUMNS}${savedSearchSuffix}`
              );
              await PageObjects.header.waitUntilLoadingHasFinished();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(
                `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}`
              );
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document'] // legacy behaviour
                );
              });
            });

            it('should render selected columns correctly', async () => {
              // check in Discover
              await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
              await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting
                    ? ['bytes', 'extension']
                    : ['@timestamp', 'bytes', 'extension']
                );
              });

              await PageObjects.discover.saveSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`
              );
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  'extension',
                  '@timestamp',
                ]);
              });

              await PageObjects.discover.saveSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}`,
                true
              );
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await dataGrid.clickMoveColumnLeft('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  '@timestamp',
                  'extension',
                ]);
              });

              await dataGrid.clickMoveColumnLeft('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  '@timestamp',
                  'bytes',
                  'extension',
                ]);
              });

              await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting
                    ? ['bytes', 'extension']
                    : ['@timestamp', 'bytes', 'extension']
                );
              });

              // check in Dashboard
              await PageObjects.common.navigateToApp('dashboard');
              await PageObjects.dashboard.clickNewDashboard();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}`
              );
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting
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
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  'extension',
                  '@timestamp',
                ]);
              });
            });
          });

          describe('without a time field', () => {
            beforeEach(async () => {
              await PageObjects.discover.createAdHocDataView('logs*', false);
              await PageObjects.discover.waitUntilSearchingHasFinished();
              await PageObjects.header.waitUntilLoadingHasFinished();
            });

            it('should render initial columns correctly', async () => {
              expect(await dataGrid.getHeaderFields()).to.eql(['Document']);

              await PageObjects.discover.saveSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}-`);
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp']);
              });

              await PageObjects.discover.saveSearch(
                `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}-`,
                true
              );
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['Document']);
              });

              // check in Dashboard
              await PageObjects.common.navigateToApp('dashboard');
              await PageObjects.dashboard.clickNewDashboard();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(`${SEARCH_NO_COLUMNS}${savedSearchSuffix}-`);
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['Document']);
              });

              await dashboardPanelActions.removePanelByTitle(
                `${SEARCH_NO_COLUMNS}${savedSearchSuffix}-`
              );
              await PageObjects.header.waitUntilLoadingHasFinished();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(
                `${SEARCH_WITH_ONLY_TIMESTAMP}${savedSearchSuffix}-`
              );
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp']);
              });
            });

            it('should render selected columns correctly', async () => {
              await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
              await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension']);
              });

              await PageObjects.discover.saveSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}-`
              );
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  'extension',
                  '@timestamp',
                ]);
              });

              await PageObjects.discover.saveSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}-`,
                true
              );
              await PageObjects.discover.waitUntilSearchingHasFinished();

              await dataGrid.clickMoveColumnLeft('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  '@timestamp',
                  'extension',
                ]);
              });

              await dataGrid.clickMoveColumnLeft('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  '@timestamp',
                  'bytes',
                  'extension',
                ]);
              });

              await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension']);
              });

              // check in Dashboard
              await PageObjects.common.navigateToApp('dashboard');
              await PageObjects.dashboard.clickNewDashboard();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}-`
              );
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension']);
              });

              await dashboardPanelActions.removePanelByTitle(
                `${SEARCH_WITH_SELECTED_COLUMNS}${savedSearchSuffix}-`
              );
              await PageObjects.header.waitUntilLoadingHasFinished();
              await dashboardAddPanel.clickOpenAddPanel();
              await dashboardAddPanel.addSavedSearch(
                `${SEARCH_WITH_SELECTED_COLUMNS_AND_TIMESTAMP}${savedSearchSuffix}-`
              );
              await dashboardAddPanel.closeAddPanel();
              await PageObjects.header.waitUntilLoadingHasFinished();

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  'extension',
                  '@timestamp',
                ]);
              });
            });
          });
        });
      });
    });
  });
}
