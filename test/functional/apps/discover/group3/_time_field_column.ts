/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

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
    });

    [false, true].forEach((hideTimeFieldColumnSetting) => {
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
              expect(await dataGrid.getHeaderFields()).to.eql(
                hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
              );

              await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document'] // legacy behaviour
                );
              });

              await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting ? ['Document'] : ['@timestamp', 'Document']
                );
              });
            });

            it('should render selected columns correctly', async () => {
              await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
              await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');

              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql(
                  hideTimeFieldColumnSetting
                    ? ['bytes', 'extension']
                    : ['@timestamp', 'bytes', 'extension']
                );
              });

              await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
              await retry.try(async () => {
                expect(await dataGrid.getHeaderFields()).to.eql([
                  'bytes',
                  'extension',
                  '@timestamp',
                ]);
              });

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
            });
          });
        });
      });
    });
  });
}
