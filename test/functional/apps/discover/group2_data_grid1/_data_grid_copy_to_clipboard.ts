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
  const dataGrid = getService('dataGrid');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const toasts = getService('toasts');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker', 'dashboard']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover data grid supports copy to clipboard', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      log.debug('reset uiSettings');
      await kibanaServer.uiSettings.replace({});
    });

    it('should be able to copy a column values to clipboard', async () => {
      const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await dataGrid.clickCopyColumnValues('@timestamp');

      if (canReadClipboard) {
        const copiedTimestampData = await browser.getClipboardValue();
        expect(
          copiedTimestampData.startsWith(
            '"\'@timestamp"\n"Sep 22, 2015 @ 23:50:13.253"\n"Sep 22, 2015 @ 23:43:58.175"'
          )
        ).to.be(true);
      }

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await dataGrid.clickCopyColumnValues('_source');

      if (canReadClipboard) {
        const copiedSourceData = await browser.getClipboardValue();
        expect(copiedSourceData.startsWith('Document\n{"@message":["238.171.34.42')).to.be(true);
        expect(copiedSourceData.endsWith('}')).to.be(true);
      }

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();
    });

    it('should be able to copy a column name to clipboard', async () => {
      const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await dataGrid.clickCopyColumnName('@timestamp');
      if (canReadClipboard) {
        const copiedTimestampName = await browser.getClipboardValue();
        expect(copiedTimestampName).to.be('@timestamp');
      }

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();

      await dataGrid.clickCopyColumnName('_source');

      if (canReadClipboard) {
        const copiedSourceName = await browser.getClipboardValue();
        expect(copiedSourceName).to.be('Document');
      }

      expect(await toasts.getCount()).to.be(1);
      await toasts.dismissAll();
    });
  });
}
