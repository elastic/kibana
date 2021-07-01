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

  describe('date in a nested field should produce an error message', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/date_nested');
      await security.testUser.setRoles(['kibana_admin', 'kibana_date_nested']);
      await PageObjects.common.navigateToUrl('discover', '#/?_a=(index:date-nested)');
    });

    after(async function unloadMakelogs() {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('test/functional/fixtures/es_archiver/date_nested');
    });

    it('should show an error message', async function () {
      await testSubjects.existOrFail('discoverNoResultsError');
    });
  });
}
