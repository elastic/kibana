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
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'timePicker']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('test hide announcements', function () {
    before(async function () {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'doc_table:legacy': true,
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });

    it('should display try document explorer button', async function () {
      await PageObjects.discover.selectIndexPattern('logstash-*');
      const tourButtonExists = await testSubjects.exists('tryDocumentExplorerButton');
      expect(tourButtonExists).to.be(true);
    });

    it('should not display try document explorer button', async function () {
      await kibanaServer.uiSettings.update({ hideAnnouncements: true });
      await browser.refresh();
      const tourButtonExists = await testSubjects.exists('tryDocumentExplorerButton');
      expect(tourButtonExists).to.be(false);
    });
  });
}
