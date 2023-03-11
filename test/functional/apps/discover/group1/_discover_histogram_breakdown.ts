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
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  describe('discover unified histogram breakdown', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('should choose breakdown field', async () => {
      await PageObjects.discover.chooseBreakdownField('extension.raw');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const list = await PageObjects.discover.getHistogramLegendList();
      expect(list).to.eql(['Other', 'png', 'css', 'jpg']);
    });

    it('should add filter using histogram legend values', async () => {
      await PageObjects.discover.clickLegendFilter('png', '+');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await filterBar.hasFilter('extension.raw', 'png')).to.be(true);
    });

    it('should save breakdown field in saved search', async () => {
      await filterBar.removeFilter('extension.raw');
      await PageObjects.discover.saveSearch('with breakdown');

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const prevList = await PageObjects.discover.getHistogramLegendList();
      expect(prevList).to.eql([]);

      await PageObjects.discover.loadSavedSearch('with breakdown');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const list = await PageObjects.discover.getHistogramLegendList();
      expect(list).to.eql(['Other', 'png', 'css', 'jpg']);
    });
  });
}
