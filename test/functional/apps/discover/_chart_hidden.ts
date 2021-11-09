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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover show/hide chart test', function () {
    before(async function () {
      log.debug('load kibana index with default index pattern');

      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('defaultIndex');
    });

    it('shows chart by default', async function () {
      expect(await PageObjects.discover.isChartVisible()).to.be(true);
    });

    it('hiding the chart persists the setting', async function () {
      await PageObjects.discover.toggleChartVisibility();
      expect(await PageObjects.discover.isChartVisible()).to.be(false);

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await PageObjects.discover.isChartVisible()).to.be(false);
    });

    it('persists hidden chart option on the saved search ', async function () {
      const savedSearchTitle = 'chart hidden';
      await PageObjects.discover.saveSearch(savedSearchTitle);

      await PageObjects.discover.toggleChartVisibility();
      expect(await PageObjects.discover.isChartVisible()).to.be(true);

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.isChartVisible()).to.be(true);

      await PageObjects.discover.loadSavedSearch(savedSearchTitle);
      expect(await PageObjects.discover.isChartVisible()).to.be(false);
    });
  });
}
