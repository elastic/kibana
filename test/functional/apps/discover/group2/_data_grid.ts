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
  describe('discover data grid tests', function describeDiscoverDataGrid() {
    const esArchiver = getService('esArchiver');
    const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
    const kibanaServer = getService('kibanaServer');
    const defaultSettings = { defaultIndex: 'logstash-*' };
    const testSubjects = getService('testSubjects');
    const security = getService('security');

    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('can add fields to the table', async function () {
      const getTitles = async () =>
        (await testSubjects.getVisibleText('dataGridHeader')).replace(/\s|\r?\n|\r/g, ' ');

      expect(await getTitles()).to.be('@timestamp Document');

      await PageObjects.discover.clickFieldListItemAdd('bytes');
      expect(await getTitles()).to.be('@timestamp bytes');

      await PageObjects.discover.clickFieldListItemAdd('agent');
      expect(await getTitles()).to.be('@timestamp bytes agent');

      await PageObjects.discover.clickFieldListItemRemove('bytes');
      expect(await getTitles()).to.be('@timestamp agent');

      await PageObjects.discover.clickFieldListItemRemove('agent');
      expect(await getTitles()).to.be('@timestamp Document');
    });
  });
}
