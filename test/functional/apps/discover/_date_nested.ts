/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');

  describe('timefield is a date in a nested field', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/date_nested');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/date_nested.json'
      );
      await security.testUser.setRoles(['kibana_admin', 'kibana_date_nested']);
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function unloadMakelogs() {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('test/functional/fixtures/es_archiver/date_nested');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/date_nested');
    });

    it('should show an error message', async function () {
      await PageObjects.discover.selectIndexPattern('date-nested');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await testSubjects.existOrFail('discoverNoResultsError');
    });
  });
}
