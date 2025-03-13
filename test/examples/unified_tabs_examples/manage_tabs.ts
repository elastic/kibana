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
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const { common, header, unifiedTabs } = getPageObjects(['common', 'header', 'unifiedTabs']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');

  describe('Managing Unified Tabs', () => {
    before(async () => {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await common.navigateToApp('unifiedTabsExamples');
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should show tabs in a responsive way', async () => {
      expect(await unifiedTabs.getNumberOfTabs()).to.be(7);
      expect(await unifiedTabs.isScrollable()).to.be(false);
      expect((await unifiedTabs.getTabWidths()).every((width) => width > 140)).to.be(true);
      await unifiedTabs.createNewTab();
      await unifiedTabs.createNewTab();
      await unifiedTabs.createNewTab();
      expect((await unifiedTabs.getTabWidths()).every((width) => width < 140 && width > 96)).to.be(
        true
      );
      await unifiedTabs.createNewTab();
      await unifiedTabs.createNewTab();
      expect(await unifiedTabs.getNumberOfTabs()).to.be(12);
      await unifiedTabs.waitForScrollButtons();
      expect((await unifiedTabs.getTabWidths()).every((width) => width === 96)).to.be(true);
    });
  });
};
