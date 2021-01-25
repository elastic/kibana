/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from './ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:searchFieldsFromSource': false,
  };
  describe('discover uses fields API test', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({ 'discover:searchFieldsFromSource': true });
    });

    it('should correctly display documents', async function () {
      log.debug('check if Document title exists in the grid');
      expect(await PageObjects.discover.getDocHeader()).to.have.string('Document');
      const rowData = await PageObjects.discover.getDocTableIndex(1);
      log.debug('check the newest doc timestamp in UTC (check diff timezone in last test)');
      expect(rowData.startsWith('Sep 22, 2015 @ 23:50:13.253')).to.be.ok();
      const expectedHitCount = '14,004';
      await retry.try(async function () {
        expect(await PageObjects.discover.getHitCount()).to.be(expectedHitCount);
      });
    });

    it('adding a column removes a default column', async function () {
      await PageObjects.discover.clickFieldListItemAdd('_score');
      expect(await PageObjects.discover.getDocHeader()).to.have.string('_score');
      expect(await PageObjects.discover.getDocHeader()).not.to.have.string('Document');
    });

    it('removing a column adds a default column', async function () {
      await PageObjects.discover.clickFieldListItemRemove('_score');
      expect(await PageObjects.discover.getDocHeader()).not.to.have.string('_score');
      expect(await PageObjects.discover.getDocHeader()).to.have.string('Document');
    });
  });
}
