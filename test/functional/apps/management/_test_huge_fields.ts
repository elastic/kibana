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
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'home', 'settings']);

  // FLAKY: https://github.com/elastic/kibana/issues/89031
  describe('test large number of fields', function () {
    this.tags(['skipCloud']);

    const EXPECTED_FIELD_COUNT = '10006';
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_testhuge_reader']);
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/large_fields');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('testhuge', 'date');
    });

    it('test_huge data should have expected number of fields', async function () {
      const tabCount = await PageObjects.settings.getFieldsTabCount();
      expect(tabCount).to.be(EXPECTED_FIELD_COUNT);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('test/functional/fixtures/es_archiver/large_fields');
    });
  });
}
