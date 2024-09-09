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
  const { common, discover, timePicker, header, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedFieldList',
  ]);

  describe('discover drag and drop', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await unifiedFieldList.cleanSidebarLocalStorage();
    });

    describe('should add fields as columns via drag and drop', function () {
      it('should support dragging and dropping a field onto the grid', async function () {
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await unifiedFieldList.getSidebarAriaDescription()).to.be(
          '48 available fields. 5 empty fields. 4 meta fields.'
        );
        expect((await discover.getColumnHeaders()).join(', ')).to.be('@timestamp, Document');

        await discover.dragFieldToTable('extension');

        expect((await discover.getColumnHeaders()).join(', ')).to.be('@timestamp, extension');

        await discover.waitUntilSearchingHasFinished();

        expect((await unifiedFieldList.getSidebarSectionFieldNames('selected')).join(', ')).to.be(
          'extension'
        );
      });

      it('should support dragging and dropping a field onto the grid (with keyboard)', async function () {
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        expect(await unifiedFieldList.getSidebarAriaDescription()).to.be(
          '48 available fields. 5 empty fields. 4 meta fields.'
        );
        expect((await discover.getColumnHeaders()).join(', ')).to.be('@timestamp, Document');

        await discover.dragFieldWithKeyboardToTable('@message');

        expect((await discover.getColumnHeaders()).join(', ')).to.be('@timestamp, @message');

        await discover.waitUntilSearchingHasFinished();

        expect((await unifiedFieldList.getSidebarSectionFieldNames('selected')).join(', ')).to.be(
          '@message'
        );
      });
    });
  });
}
