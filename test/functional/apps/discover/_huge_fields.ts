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
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'timePicker']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  describe('test large number of fields in sidebar', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/huge_fields');
      await security.testUser.setRoles(['kibana_admin', 'test_testhuge_reader'], {
        skipBrowserRefresh: true,
      });
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "2016-10-05T00:00:00", "to": "2016-10-06T00:00:00"}`,
      });
      await PageObjects.common.navigateToApp('discover');
    });

    it('test_huge data should have expected number of fields', async function () {
      await PageObjects.discover.selectIndexPattern('testhuge*');
      // initially this field should not be rendered
      const fieldExistsBeforeScrolling = await testSubjects.exists('field-myvar1050');
      expect(fieldExistsBeforeScrolling).to.be(false);
      // scrolling down a little, should render this field
      await testSubjects.scrollIntoView('fieldToggle-myvar1029');
      const fieldExistsAfterScrolling = await testSubjects.exists('field-myvar1050');
      expect(fieldExistsAfterScrolling).to.be(true);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('test/functional/fixtures/es_archiver/huge_fields');
      await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
    });
  });
}
