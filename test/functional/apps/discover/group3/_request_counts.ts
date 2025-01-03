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
  const { common, discover, timePicker, header } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
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
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    const expectSearchCount = async (type: 'ese' | 'esql', searchCount: number) => {
      await retry.try(async () => {
        if (searchCount === 0) {
          await browser.execute(async () => {
            performance.clearResourceTimings();
          });
        }
        await waitForLoadingToFinish();
        const endpoint = type === 'esql' ? `${type}_async` : type;
        const requests = await browser.execute(() =>
          performance
            .getEntries()
            .filter((entry: any) => ['fetch', 'xmlhttprequest'].includes(entry.initiatorType))
        );

        const result = requests.filter((entry) =>
          entry.name.endsWith(`/internal/search/${endpoint}`)
        );

        const count = result.length;
        if (count !== searchCount) {
          log.warning('Request count differs:', result);
        }
        expect(count).to.be(searchCount);
      });
    };

    const waitForLoadingToFinish = async () => {
      await header.waitUntilLoadingHasFinished();
      await discover.waitForDocTableLoadingComplete();
      await elasticChart.canvasExists();
    };

    const expectSearches = async (type: 'ese' | 'esql', expected: number, cb: Function) => {
      await expectSearchCount(type, 0);
      await cb();
      await expectSearchCount(type, expected);
    };

    const getSharedTests = ({
      type,
      savedSearch,
      query1,
      query2,
      savedSearchesRequests,
      setQuery,
      expectedRequests = 2,
    }: {
      type: 'ese' | 'esql';
      savedSearch: string;
      query1: string;
      query2: string;
      savedSearchesRequests?: number;
      setQuery: (query: string) => Promise<void>;
      expectedRequests?: number;
      expectedRefreshRequest?: number;
    }) => {
      it(`should send no more than ${expectedRequests} search requests (documents + chart) on page load`, async () => {
        await browser.refresh();
        await browser.execute(async () => {
          performance.setResourceTimingBufferSize(Number.MAX_SAFE_INTEGER);
        });
        await waitForLoadingToFinish();
        // one more requests for fields in ESQL mode
        const actualExpectedRequests = type === 'esql' ? expectedRequests + 1 : expectedRequests;
        await expectSearchCount(type, actualExpectedRequests);
      });

      it(`should send no more than ${expectedRequests} requests (documents + chart) when refreshing`, async () => {
        await expectSearches(type, expectedRequests, async () => {
          await queryBar.clickQuerySubmitButton();
        });
      });

      it(`should send no more than ${expectedRequests} requests (documents + chart) when changing the query`, async () => {
        await expectSearches(type, expectedRequests, async () => {
          await setQuery(query1);
          await queryBar.clickQuerySubmitButton();
        });
      });

      it(`should send no more than ${expectedRequests} requests (documents + chart) when changing the time range`, async () => {
        await expectSearches(
          type,
          type === 'esql' ? expectedRequests + 1 : expectedRequests,
          async () => {
            await timePicker.setAbsoluteRange(
              'Sep 21, 2015 @ 06:31:44.000',
              'Sep 23, 2015 @ 00:00:00.000'
            );
          }
        );
      });

      it(`should send ${savedSearchesRequests} requests for saved search changes`, async () => {
        await setQuery(query1);
        await queryBar.clickQuerySubmitButton();
        await timePicker.setAbsoluteRange(
          'Sep 21, 2015 @ 06:31:44.000',
          'Sep 23, 2015 @ 00:00:00.000'
        );
        await waitForLoadingToFinish();
        const actualExpectedRequests = savedSearchesRequests ?? expectedRequests;
        log.debug('Creating saved search');
        await expectSearches(
          type,
          type === 'esql' ? actualExpectedRequests + 2 : actualExpectedRequests,
          async () => {
            await discover.saveSearch(savedSearch);
          }
        );
        log.debug('Resetting saved search');
        await setQuery(query2);
        await queryBar.clickQuerySubmitButton();
        await waitForLoadingToFinish();
        await expectSearches(type, actualExpectedRequests, async () => {
          await discover.revertUnsavedChanges();
        });
        log.debug('Clearing saved search');
        await expectSearches(
          type,
          type === 'esql' ? actualExpectedRequests + 2 : actualExpectedRequests,
          async () => {
            await testSubjects.click('discoverNewButton');
            await waitForLoadingToFinish();
          }
        );
        log.debug('Loading saved search');
        await expectSearches(
          type,
          type === 'esql' ? actualExpectedRequests + 2 : actualExpectedRequests,
          async () => {
            await discover.loadSavedSearch(savedSearch);
          }
        );
      });
    };

    describe('data view mode', () => {
      const type = 'ese';

      beforeEach(async () => {
        await common.navigateToApp('discover');
        await header.waitUntilLoadingHasFinished();
      });

      getSharedTests({
        type,
        savedSearch: 'data view test',
        query1: 'bytes > 1000',
        query2: 'bytes < 2000',
        setQuery: (query) => queryBar.setQuery(query),
      });

      it(`should send no more than 2 requests (documents + chart) when toggling the chart visibility`, async () => {
        await expectSearches(type, 2, async () => {
          await discover.toggleChartVisibility();
        });
        await expectSearches(type, 2, async () => {
          await discover.toggleChartVisibility();
        });
      });

      it('should send no more than 2 requests (documents + chart) when adding a filter', async () => {
        await expectSearches(type, 2, async () => {
          await filterBar.addFilter({
            field: 'extension',
            operation: 'is',
            value: 'jpg',
          });
        });
      });

      it('should send no more than 2 requests (documents + chart) when sorting', async () => {
        await expectSearches(type, 2, async () => {
          await discover.clickFieldSort('@timestamp', 'Sort Old-New');
        });
      });

      it('should send no more than 2 requests (documents + chart) when changing to a breakdown field without an other bucket', async () => {
        await expectSearches(type, 2, async () => {
          await discover.chooseBreakdownField('type');
        });
      });

      it('should send no more than 3 requests (documents + chart + other bucket) when changing to a breakdown field with an other bucket', async () => {
        await testSubjects.click('discoverNewButton');
        await expectSearches(type, 3, async () => {
          await discover.chooseBreakdownField('extension.raw');
        });
      });

      it('should send no more than 2 requests (documents + chart) when changing the chart interval', async () => {
        await expectSearches(type, 2, async () => {
          await discover.setChartInterval('Day');
        });
      });

      it('should send no more than 2 requests (documents + chart) when changing the data view', async () => {
        await expectSearches(type, 2, async () => {
          await discover.selectIndexPattern('long-window-logstash-*');
        });
      });
    });

    describe('ES|QL mode', () => {
      const type = 'esql';
      before(async () => {
        await common.navigateToApp('discover');
        await header.waitUntilLoadingHasFinished();
        await discover.selectTextBaseLang();
      });

      beforeEach(async () => {
        await monacoEditor.setCodeEditorValue('from logstash-* | where bytes > 1000 ');
        await queryBar.clickQuerySubmitButton();
        await waitForLoadingToFinish();
      });

      getSharedTests({
        type,
        savedSearch: 'esql test',
        query1: 'from logstash-* | where bytes > 1000 ',
        query2: 'from logstash-* | where bytes < 2000 ',
        savedSearchesRequests: 2,
        setQuery: (query) => monacoEditor.setCodeEditorValue(query),
        expectedRequests: 2,
      });

      it(`should send requests (documents + chart) when toggling the chart visibility`, async () => {
        await expectSearches(type, 1, async () => {
          await discover.toggleChartVisibility();
        });
        await expectSearches(type, 3, async () => {
          await discover.toggleChartVisibility();
        });
      });
    });
  });
}
