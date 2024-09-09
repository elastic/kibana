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
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const { common, discover, timePicker, settings, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'settings',
    'unifiedFieldList',
  ]);
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:searchFieldsFromSource': false,
  };
  describe('discover uses fields API test', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });

    it('should correctly display documents', async function () {
      log.debug('check if Document title exists in the grid');
      expect(await discover.getDocHeader()).to.have.string('Document');
      const rowData = await discover.getDocTableIndex(1);
      log.debug('check the newest doc timestamp in UTC (check diff timezone in last test)');
      expect(rowData.startsWith('Sep 22, 2015 @ 23:50:13.253')).to.be.ok();
      const expectedHitCount = '14,004';
      await retry.try(async function () {
        expect(await discover.getHitCount()).to.be(expectedHitCount);
      });
    });

    it('adding a column removes a default column', async function () {
      await unifiedFieldList.clickFieldListItemAdd('_score');
      expect(await discover.getDocHeader()).to.have.string('_score');
      expect(await discover.getDocHeader()).not.to.have.string('Document');
    });

    it('removing a column adds a default column', async function () {
      await unifiedFieldList.clickFieldListItemRemove('_score');
      expect(await discover.getDocHeader()).not.to.have.string('_score');
      expect(await discover.getDocHeader()).to.have.string('Document');
    });

    it('displays _source viewer in doc viewer', async function () {
      await dataGrid.clickRowToggle();
      await discover.isShowingDocViewer();
      await discover.clickDocViewerTab('doc_view_source');
      await discover.expectSourceViewerToExist();
    });

    it('switches to _source column when fields API is no longer used', async function () {
      await settings.navigateTo();
      await settings.clickKibanaSettings();
      await settings.toggleAdvancedSettingCheckbox('discover:searchFieldsFromSource');

      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();

      expect(await discover.getDocHeader()).to.have.string('Document');
    });

    it('switches to Document column when fields API is used', async function () {
      await settings.navigateTo();
      await settings.clickKibanaSettings();
      await settings.toggleAdvancedSettingCheckbox('discover:searchFieldsFromSource');

      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();

      expect(await discover.getDocHeader()).to.have.string('Document');
    });
  });
}
