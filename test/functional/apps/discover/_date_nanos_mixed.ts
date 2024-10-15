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
  const fromTime = 'Jan 1, 2019 @ 00:00:00.000';
  const toTime = 'Jan 1, 2019 @ 23:59:59.999';

  describe('date_nanos_mixed', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/date_nanos_mixed');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/date_nanos_mixed'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'timestamp-*' });
      await security.testUser.setRoles(['kibana_admin', 'kibana_date_nanos_mixed']);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await esArchiver.unload('test/functional/fixtures/es_archiver/date_nanos_mixed');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('shows a list of records of indices with date & date_nanos fields in the right order', async function () {
      const isLegacy = await PageObjects.discover.useLegacyTable();
      const rowData1 = await PageObjects.discover.getDocTableIndex(1);
      expect(rowData1).to.contain('Jan 1, 2019 @ 12:10:30.124000000');
      const rowData2 = await PageObjects.discover.getDocTableIndex(isLegacy ? 3 : 2);
      expect(rowData2).to.contain('Jan 1, 2019 @ 12:10:30.123498765');
      const rowData3 = await PageObjects.discover.getDocTableIndex(isLegacy ? 5 : 3);
      expect(rowData3).to.contain('Jan 1, 2019 @ 12:10:30.123456789');
      const rowData4 = await PageObjects.discover.getDocTableIndex(isLegacy ? 7 : 4);
      expect(rowData4).to.contain('Jan 1, 2019 @ 12:10:30.123000000');
    });
  });
}
