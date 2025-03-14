/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects, updateBaselines }: FtrProviderContext) => {
  const { common, header, unifiedTabs, unifiedFieldList } = getPageObjects([
    'common',
    'header',
    'unifiedTabs',
    'unifiedFieldList',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const screenshot = getService('screenshots');

  describe('Unified Tabs Design', () => {
    before(async () => {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await common.navigateToApp('unifiedTabsExamples');
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({
        'theme:darkMode': false,
      });
    });

    it('should render tabs in light theme correctly', async () => {
      expect(await unifiedTabs.getNumberOfTabs()).to.be(7);

      const percentDifference = await screenshot.compareAgainstBaseline(
        'unified_tabs_classic_light_theme',
        updateBaselines
      );
      expect(percentDifference).to.be.lessThan(0.0002);
    });

    it('should render tabs in dark theme correctly', async () => {
      await kibanaServer.uiSettings.update({
        'theme:darkMode': true,
      });
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      expect(await unifiedTabs.getNumberOfTabs()).to.be(7);

      const percentDifference = await screenshot.compareAgainstBaseline(
        'unified_tabs_classic_dark_theme',
        updateBaselines
      );
      expect(percentDifference).to.be.lessThan(0.0002);
    });
  });
};
