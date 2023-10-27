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
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
    'visualize',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover URL state', () => {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('should show a warning and fall back to the default data view when navigating to a URL with an invalid data view ID', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const dataViewId = await PageObjects.discover.getCurrentDataViewId();
      const originalUrl = await browser.getCurrentUrl();
      const newUrl = originalUrl.replace(dataViewId, 'invalid-data-view-id');
      await browser.get(newUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        expect(await browser.getCurrentUrl()).to.be(originalUrl);
        expect(await testSubjects.exists('dscDataViewNotFoundShowDefaultWarning')).to.be(true);
      });
    });

    it('should show a warning and fall back to the current data view if the URL is updated to an invalid data view ID', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      const originalHash = await browser.execute<[], string>('return window.location.hash');
      const dataViewId = await PageObjects.discover.getCurrentDataViewId();
      const newHash = originalHash.replace(dataViewId, 'invalid-data-view-id');
      await browser.execute(`window.location.hash = "${newHash}"`);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const currentHash = await browser.execute<[], string>('return window.location.hash');
        expect(currentHash).to.be(originalHash);
        expect(await testSubjects.exists('dscDataViewNotFoundShowSavedWarning')).to.be(true);
      });
    });

    it('should sync Lens global state to Discover sidebar link and carry over the state when navigating to Discover', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.common.navigateToApp('lens');
      await appsMenu.openCollapsibleNav();
      let discoverLink = await appsMenu.getLink('Discover');
      expect(discoverLink?.href).to.contain(
        '/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))' +
          "&_a=(columns:!(),filters:!(),index:'logstash-*',interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))"
      );
      await appsMenu.closeCollapsibleNav();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await filterBar.addFilter({
        field: 'extension.raw',
        operation: 'is one of',
        value: ['jpg', 'css'],
      });
      await filterBar.toggleFilterPinned('extension.raw');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await appsMenu.openCollapsibleNav();
      discoverLink = await appsMenu.getLink('Discover');
      expect(discoverLink?.href).to.contain(
        "/app/discover#/?_g=(filters:!(('$state':(store:globalState)," +
          "meta:(alias:!n,disabled:!f,field:extension.raw,index:'logstash-*'," +
          'key:extension.raw,negate:!f,params:!(jpg,css),type:phrases,value:!(jpg,css)),' +
          'query:(bool:(minimum_should_match:1,should:!((match_phrase:(extension.raw:jpg)),' +
          "(match_phrase:(extension.raw:css))))))),query:(language:kuery,query:'')," +
          "refreshInterval:(pause:!t,value:60000),time:(from:'2015-09-19T06:31:44.000Z'," +
          "to:'2015-09-23T18:31:44.000Z'))&_a=(columns:!(),filters:!(),index:'logstash-*'," +
          "interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))"
      );
      await appsMenu.clickLink('Discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await filterBar.hasFilter('extension.raw', '', undefined, true)).to.be(true);
      expect(await filterBar.isFilterPinned('extension.raw')).to.be(true);
      expect(await PageObjects.timePicker.getTimeConfig()).to.eql({
        start: 'Sep 19, 2015 @ 06:31:44.000',
        end: 'Sep 23, 2015 @ 18:31:44.000',
      });
      expect(await PageObjects.discover.getHitCount()).to.be('11,268');
    });
  });
}
