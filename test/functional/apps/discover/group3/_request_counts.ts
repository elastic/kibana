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
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedSearch',
    'settings',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const monacoEditor = getService('monacoEditor');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const elasticChart = getService('elasticChart');

  describe('discover request counts', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        'bfetch:disable': true,
        'discover:enableESQL': true,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    const getSearchCount = async (type: 'ese' | 'esql') => {
      const requests = await browser.execute(() =>
        performance
          .getEntries()
          .filter((entry: any) => ['fetch', 'xmlhttprequest'].includes(entry.initiatorType))
      );
      return requests.filter((entry) => entry.name.endsWith(`/internal/search/${type}`)).length;
    };

    const waitForLoadingToFinish = async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitForDocTableLoadingComplete();
      await elasticChart.canvasExists();
    };

    const expectSearches = async (type: 'ese' | 'esql', expected: number, cb: Function) => {
      await browser.execute(async () => {
        performance.clearResourceTimings();
      });
      let searchCount = await getSearchCount(type);
      expect(searchCount).to.be(0);
      await cb();
      await waitForLoadingToFinish();
      searchCount = await getSearchCount(type);
      expect(searchCount).to.be(expected);
    };

    const getSharedTests = ({
      type,
      savedSearch,
      query1,
      query2,
      savedSearchesRequests,
      setQuery,
    }: {
      type: 'ese' | 'esql';
      savedSearch: string;
      query1: string;
      query2: string;
      savedSearchesRequests?: number;
      setQuery: (query: string) => Promise<void>;
    }) => {
      it('should send 2 search requests (documents + chart) on page load', async () => {
        await browser.refresh();
        await browser.execute(async () => {
          performance.setResourceTimingBufferSize(Number.MAX_SAFE_INTEGER);
        });
        await waitForLoadingToFinish();
        const searchCount = await getSearchCount(type);
        expect(searchCount).to.be(2);
      });

      it('should send 2 requests (documents + chart) when refreshing', async () => {
        await expectSearches(type, 2, async () => {
          await queryBar.clickQuerySubmitButton();
        });
      });

      it('should send 2 requests (documents + chart) when changing the query', async () => {
        await expectSearches(type, 2, async () => {
          await setQuery(query1);
          await queryBar.clickQuerySubmitButton();
        });
      });

      it('should send 2 requests (documents + chart) when changing the time range', async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.timePicker.setAbsoluteRange(
            'Sep 21, 2015 @ 06:31:44.000',
            'Sep 23, 2015 @ 00:00:00.000'
          );
        });
      });

      it('should send 2 requests (documents + chart) when toggling the chart visibility', async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
      });

      it('should send 2 requests for saved search changes', async () => {
        await setQuery(query1);
        await queryBar.clickQuerySubmitButton();
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 21, 2015 @ 06:31:44.000',
          'Sep 23, 2015 @ 00:00:00.000'
        );
        await waitForLoadingToFinish();
        // TODO: Check why the request happens 4 times in case of opening a saved search
        // https://github.com/elastic/kibana/issues/165192
        // creating the saved search
        await expectSearches(type, savedSearchesRequests ?? 2, async () => {
          await PageObjects.discover.saveSearch(savedSearch);
        });
        // resetting the saved search
        await setQuery(query2);
        await queryBar.clickQuerySubmitButton();
        await waitForLoadingToFinish();
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.clickResetSavedSearchButton();
        });
        // clearing the saved search
        await expectSearches('ese', 2, async () => {
          await testSubjects.click('discoverNewButton');
          await waitForLoadingToFinish();
        });
        // loading the saved search
        // TODO: https://github.com/elastic/kibana/issues/165192
        await expectSearches(type, savedSearchesRequests ?? 2, async () => {
          await PageObjects.discover.loadSavedSearch(savedSearch);
        });
      });
    };

    describe('data view mode', () => {
      const type = 'ese';

      getSharedTests({
        type,
        savedSearch: 'data view test',
        query1: 'bytes > 1000',
        query2: 'bytes < 2000',
        setQuery: (query) => queryBar.setQuery(query),
      });

      it('should send 2 requests (documents + chart) when adding a filter', async () => {
        await expectSearches(type, 2, async () => {
          await filterBar.addFilter({
            field: 'extension',
            operation: 'is',
            value: 'jpg',
          });
        });
      });

      it('should send 2 requests (documents + chart) when sorting', async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.clickFieldSort('@timestamp', 'Sort Old-New');
        });
      });

      it('should send 2 requests (documents + chart) when changing to a breakdown field without an other bucket', async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.chooseBreakdownField('type');
        });
      });

      it('should send 3 requests (documents + chart + other bucket) when changing to a breakdown field with an other bucket', async () => {
        await expectSearches(type, 3, async () => {
          await PageObjects.discover.chooseBreakdownField('extension.raw');
        });
      });

      it('should send 2 requests (documents + chart) when changing the chart interval', async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.setChartInterval('Day');
        });
      });

      it('should send 2 requests (documents + chart) when changing the data view', async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.selectIndexPattern('long-window-logstash-*');
        });
      });
    });

    describe('ES|QL mode', () => {
      const type = 'esql';

      beforeEach(async () => {
        await PageObjects.discover.selectTextBaseLang();
        monacoEditor.setCodeEditorValue(
          'from logstash-* | where bytes > 1000 | stats countB = count(bytes)'
        );
        await queryBar.clickQuerySubmitButton();
        await waitForLoadingToFinish();
      });

      getSharedTests({
        type,
        savedSearch: 'esql test',
        query1: 'from logstash-* | where bytes > 1000 | stats countB = count(bytes) ',
        query2: 'from logstash-* | where bytes < 2000 | stats countB = count(bytes) ',
        savedSearchesRequests: 4,
        setQuery: (query) => monacoEditor.setCodeEditorValue(query),
      });
    });
  });
}
