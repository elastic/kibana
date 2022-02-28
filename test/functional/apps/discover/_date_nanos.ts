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
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const fromTime = 'Sep 22, 2019 @ 20:31:44.000';
  const toTime = 'Sep 23, 2019 @ 03:31:44.000';

  describe('date_nanos', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/date_nanos');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/date_nanos');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'date-nanos' });
      await security.testUser.setRoles(['kibana_admin', 'kibana_date_nanos']);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(async function unloadMakelogs() {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('test/functional/fixtures/es_archiver/date_nanos');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('should show a timestamp with nanoseconds in the first result row', async function () {
      const time = await PageObjects.timePicker.getTimeConfig();
      expect(time.start).to.be(fromTime);
      expect(time.end).to.be(toTime);
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData.startsWith('Sep 22, 2019 @ 23:50:13.253123345')).to.be.ok();
    });
  });
}
