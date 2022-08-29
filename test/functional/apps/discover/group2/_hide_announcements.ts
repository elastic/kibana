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
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'timePicker']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const security = getService('security');

  describe('test hide announcements', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });

    it('should display take tour button', async function () {
      await PageObjects.discover.selectIndexPattern('logstash-*');
      const tourButtonExists = await testSubjects.exists('discoverTakeTourButton');
      expect(tourButtonExists).to.be(true);
    });

    it('should not display take tour button', async function () {
      await kibanaServer.uiSettings.update({ hideAnnouncements: true });
      await browser.refresh();
      const tourButtonExists = await testSubjects.exists('discoverTakeTourButton');
      expect(tourButtonExists).to.be(false);
    });
  });
}
