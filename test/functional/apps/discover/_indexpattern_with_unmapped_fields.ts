/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);

  describe('index pattern with unmapped fields', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/unmapped_fields');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/unmapped_fields');
      await security.testUser.setRoles(['kibana_admin', 'test-index-unmapped-fields']);
      const fromTime = 'Jan 20, 2021 @ 00:00:00.000';
      const toTime = 'Jan 25, 2021 @ 00:00:00.000';

      await kibanaServer.uiSettings.replace({
        defaultIndex: 'test-index-unmapped-fields',
        'discover:searchFieldsFromSource': false,
        'timepicker:timeDefaults': `{ "from": "${fromTime}", "to": "${toTime}"}`,
      });

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('test-index-unmapped-fields');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/unmapped_fields');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.uiSettings.unset('discover:searchFieldsFromSource');
      await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
    });

    it('unmapped fields exist on a new saved search', async () => {
      const expectedHitCount = '4';
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
      const allFields = await PageObjects.discover.getAllFieldNames();
      // message is a mapped field
      expect(allFields.includes('message')).to.be(true);
      // sender is not a mapped field
      expect(allFields.includes('sender')).to.be(true);
    });

    it('unmapped fields exist on an existing saved search', async () => {
      await PageObjects.discover.loadSavedSearch('Existing Saved Search');
      const expectedHitCount = '4';
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
      const allFields = await PageObjects.discover.getAllFieldNames();
      expect(allFields.includes('message')).to.be(true);
      expect(allFields.includes('sender')).to.be(true);
      expect(allFields.includes('receiver')).to.be(true);
    });
  });
}
