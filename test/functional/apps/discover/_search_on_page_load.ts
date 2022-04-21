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
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const refreshButtonSelector = 'refreshDataButton';

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  const initSearchOnPageLoad = async (searchOnPageLoad: boolean) => {
    await kibanaServer.uiSettings.replace({ 'discover:searchOnPageLoad': searchOnPageLoad });
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.header.awaitKibanaChrome();
  };

  const waitForFetches = (fetchesNumber: number) => async () => {
    const nrOfFetches = await PageObjects.discover.getNrOfFetches();
    return nrOfFetches === fetchesNumber;
  };

  describe('usage of discover:searchOnPageLoad', () => {
    before(async function () {
      log.debug('load kibana index with default index pattern');

      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');

      // and load a set of data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.load('test/functional/fixtures/es_archiver/date_nested');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/date_nested.json'
      );

      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/date_nested');
      await esArchiver.unload('test/functional/fixtures/es_archiver/date_nested');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    describe(`when it's false`, () => {
      beforeEach(async () => await initSearchOnPageLoad(false));

      it('should not fetch data from ES initially', async function () {
        expect(await testSubjects.exists(refreshButtonSelector)).to.be(true);
        await retry.waitFor('number of fetches to be 0', waitForFetches(0));
      });

      it('should not fetch on indexPattern change', async function () {
        expect(await testSubjects.exists(refreshButtonSelector)).to.be(true);
        await retry.waitFor('number of fetches to be 0', waitForFetches(0));

        await PageObjects.discover.selectIndexPattern('date-nested');

        expect(await testSubjects.exists(refreshButtonSelector)).to.be(true);
        await retry.waitFor('number of fetches to be 0', waitForFetches(0));
      });

      it('should fetch data from ES after refreshDataButton click', async function () {
        expect(await testSubjects.exists(refreshButtonSelector)).to.be(true);
        await retry.waitFor('number of fetches to be 0', waitForFetches(0));

        await testSubjects.click(refreshButtonSelector);
        await testSubjects.missingOrFail(refreshButtonSelector);

        await retry.waitFor('number of fetches to be 1', waitForFetches(1));
      });

      it('should fetch data from ES after submit query', async function () {
        expect(await testSubjects.exists(refreshButtonSelector)).to.be(true);
        await retry.waitFor('number of fetches to be 0', waitForFetches(0));

        await queryBar.submitQuery();
        await testSubjects.missingOrFail(refreshButtonSelector);

        await retry.waitFor('number of fetches to be 1', waitForFetches(1));
      });

      it('should fetch data from ES after choosing commonly used time range', async function () {
        await PageObjects.discover.selectIndexPattern('logstash-*');
        expect(await testSubjects.exists(refreshButtonSelector)).to.be(true);
        await retry.waitFor('number of fetches to be 0', waitForFetches(0));

        await PageObjects.timePicker.setCommonlyUsedTime('This_week');
        await testSubjects.missingOrFail(refreshButtonSelector);

        await retry.waitFor('number of fetches to be 1', waitForFetches(1));
      });
    });

    it(`when it's true should fetch data from ES initially`, async function () {
      await initSearchOnPageLoad(true);
      await retry.waitFor('number of fetches to be 1', waitForFetches(1));
    });
  });
}
