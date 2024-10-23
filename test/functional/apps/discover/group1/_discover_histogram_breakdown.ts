/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const { common, discover, header, timePicker } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
  ]);

  describe('discover unified histogram breakdown', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('should choose breakdown field', async () => {
      await discover.chooseBreakdownField('extension.raw');
      await header.waitUntilLoadingHasFinished();
      const list = await discover.getHistogramLegendList();
      expect(list).to.eql(['jpg', 'css', 'png', 'Other']);
    });

    it('should add filter using histogram legend values', async () => {
      await discover.clickLegendFilter('png', '+');
      await header.waitUntilLoadingHasFinished();
      expect(await filterBar.hasFilter('extension.raw', 'png')).to.be(true);
    });

    it('should save breakdown field in saved search', async () => {
      await filterBar.removeFilter('extension.raw');
      await discover.saveSearch('with breakdown');

      await discover.clickNewSearchButton();
      await header.waitUntilLoadingHasFinished();
      const prevList = await discover.getHistogramLegendList();
      expect(prevList).to.eql([]);

      await discover.loadSavedSearch('with breakdown');
      await header.waitUntilLoadingHasFinished();
      const list = await discover.getHistogramLegendList();
      expect(list).to.eql(['jpg', 'css', 'png', 'Other']);
    });
  });
}
