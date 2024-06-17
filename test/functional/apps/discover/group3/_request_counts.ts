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
  const log = getService('log');
  const retry = getService('retry');

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
        enableESQL: true,
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
      return requests.filter((entry) =>
        type === 'esql'
          ? entry.name.includes(`/internal/search/${type}`)
          : entry.name.endsWith(`/internal/search/${type}`)
      ).length;
    };

    const waitForLoadingToFinish = async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitForDocTableLoadingComplete();
      await PageObjects.discover.waitUntilLoadingInChartHasFinished();
      await elasticChart.canvasExists();
    };

    const expectSearches = async (
      type: 'ese' | 'esql',
      expected: number,
      cb: Function,
      options?: { dontResetTimings?: boolean }
    ) => {
      let searchCount;
      if (!options?.dontResetTimings) {
        await browser.execute(async () => {
          performance.clearResourceTimings();
        });
        searchCount = await getSearchCount(type);
        expect(searchCount).to.be(0);
      }
      await cb();
      await waitForLoadingToFinish();
      await retry.waitFor('correct search request count', async () => {
        searchCount = await getSearchCount(type);

        log.debug(
          `comparing search request counts - type: ${type} actual: ${searchCount} expected: ${expected}`
        );

        // `searchCount` should be the same as `expected` or it can be less by 1
        return type === 'esql' && searchCount !== expected && searchCount > 0
          ? searchCount === expected - 1 // minus esql editor autocomplete request sometimes?
          : searchCount === expected;
      });
    };

    const getSharedTests = ({
      type,
      savedSearch,
      query1,
      query2,
      setQuery,
      expectedRequests = 2,
      expectedRequestsAfterNewSearchPressed,
      expectedRequestsAfterTimeRangeChanged,
      expectedRequestsForSavedSearches,
    }: {
      type: 'ese' | 'esql';
      savedSearch: string;
      query1: string;
      query2: string;
      setQuery: (query: string) => Promise<void>;
      expectedRequests?: number;
      expectedRequestsAfterNewSearchPressed?: number;
      expectedRequestsAfterTimeRangeChanged?: number;
      expectedRequestsForSavedSearches?: number;
    }) => {
      it(`should send ${expectedRequests} search requests (documents + chart) on page load`, async () => {
        await browser.refresh();
        await browser.execute(async () => {
          performance.setResourceTimingBufferSize(Number.MAX_SAFE_INTEGER);
        });
        await expectSearches(
          type,
          expectedRequests,
          async () => {
            // nothing
          },
          { dontResetTimings: true }
        );
      });

      it(`should send ${expectedRequests} requests (documents + chart) when refreshing`, async () => {
        await expectSearches(type, expectedRequests, async () => {
          await queryBar.clickQuerySubmitButton();
        });
      });

      it(`should send ${expectedRequests} requests (documents + chart) when changing the query`, async () => {
        await expectSearches(type, expectedRequests, async () => {
          await setQuery(query1);
          await queryBar.clickQuerySubmitButton();
        });
      });

      it(`should send ${
        expectedRequestsAfterTimeRangeChanged ?? expectedRequests
      } requests (documents + chart) when changing the time range`, async () => {
        await expectSearches(
          type,
          expectedRequestsAfterTimeRangeChanged ?? expectedRequests,
          async () => {
            await PageObjects.timePicker.setAbsoluteRange(
              'Sep 21, 2015 @ 06:31:44.000',
              'Sep 23, 2015 @ 00:00:00.000'
            );
          }
        );
      });

      it(`should send ${expectedRequests} requests for saved search changes`, async () => {
        await setQuery(query1);
        await queryBar.clickQuerySubmitButton();
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 21, 2015 @ 06:31:44.000',
          'Sep 23, 2015 @ 00:00:00.000'
        );
        await waitForLoadingToFinish();
        // creating the saved search
        await expectSearches(
          type,
          expectedRequestsForSavedSearches ?? expectedRequests,
          async () => {
            await PageObjects.discover.saveSearch(savedSearch);
          }
        );
        // resetting the saved search
        await setQuery(query2);
        await queryBar.clickQuerySubmitButton();
        await waitForLoadingToFinish();
        await expectSearches(type, expectedRequests, async () => {
          await PageObjects.discover.revertUnsavedChanges();
        });
        // clearing the saved search
        await expectSearches(
          type,
          expectedRequestsAfterNewSearchPressed ?? expectedRequests,
          async () => {
            await testSubjects.click('discoverNewButton');
            await waitForLoadingToFinish();
          }
        );
        // loading the saved search
        await expectSearches(
          type,
          expectedRequestsForSavedSearches ?? expectedRequests,
          async () => {
            await PageObjects.discover.loadSavedSearch(savedSearch);
          }
        );
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

      it(`should send 2 requests (documents + chart) when toggling the chart visibility`, async () => {
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
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

    describe('ES|QL mode requests', () => {
      const type = 'esql';

      beforeEach(async () => {
        await PageObjects.discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(
          'from logstash-* | where bytes > 1000 | stats countB = count(bytes)'
        );
        await queryBar.clickQuerySubmitButton();
        await waitForLoadingToFinish();
      });

      getSharedTests({
        type,
        savedSearch: 'esql test',
        query1: 'from logstash-* | where bytes > 1000 | stats countB = count(bytes)',
        query2: 'from logstash-* | where bytes < 2000 | stats countB = count(bytes)',
        setQuery: (query) => monacoEditor.setCodeEditorValue(query),
        expectedRequests: 2, // table and query editor autocomplete sometimes?
        expectedRequestsAfterNewSearchPressed: 4, // table, 2 chart requests, and query editor autocomplete?
      });

      it('should send 1 request (documents) when toggling the chart visibility', async () => {
        // table
        await expectSearches(type, 1, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
        // table + query editor autocomplete?
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
      });

      it('should send 0 requests (documents) when sorting in-memory', async () => {
        await expectSearches(type, 0, async () => {
          await PageObjects.discover.clickFieldSort('countB', 'Sort Low-High');
        });
      });
    });

    describe('ES|QL mode requests for histogram chart', () => {
      const type = 'esql';

      beforeEach(async () => {
        await PageObjects.discover.selectTextBaseLang();
        await waitForLoadingToFinish();
      });

      getSharedTests({
        type,
        savedSearch: 'esql test with histogram',
        query1: 'from logstash-* | sort @timestamp desc | limit 10',
        query2: 'from logstash-* | limit 20',
        setQuery: (query) => monacoEditor.setCodeEditorValue(query),
        expectedRequests: 3, // table, chart and query editor autocomplete sometimes?
        expectedRequestsAfterTimeRangeChanged: 4, // table, chart, query editor autocomplete or chart again?
        expectedRequestsAfterNewSearchPressed: 4, // table, 2 chart requests, and query editor autocomplete?
        expectedRequestsForSavedSearches: 5, // table, 2 chart requests, and query editor autocomplete?
      });

      it('should send 2 request (documents + chart) when toggling the chart visibility', async () => {
        // table, chart
        await expectSearches(type, 2, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
        // table, chart and query editor autocomplete?
        await expectSearches(type, 3, async () => {
          await PageObjects.discover.toggleChartVisibility();
        });
      });

      it('should send 0 requests when sorting in-memory', async () => {
        await expectSearches(type, 0, async () => {
          await PageObjects.discover.clickFieldSort('@timestamp', 'Sort Old-New');
        });
      });
    });
  });
}
