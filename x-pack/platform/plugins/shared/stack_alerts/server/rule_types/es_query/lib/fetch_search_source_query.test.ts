/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlySearchSourceRuleParams } from '../types';
import {
  createSearchSourceMock,
  searchSourceInstanceMock,
} from '@kbn/data-plugin/common/search/search_source/mocks';
import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  updateSearchSource,
  generateLink,
  getSmallerDataViewSpec,
  fetchSearchSourceQuery,
} from './fetch_search_source_query';
import {
  createStubDataView,
  stubbedSavedObjectIndexPattern,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { Comparator } from '../../../../common/comparator_types';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { publicRuleResultServiceMock } from '@kbn/alerting-plugin/server/monitoring/rule_result_service.mock';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import {
  getErrorSource,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running/errors';
import { updateFilterReferences } from '@kbn/es-query';

const createDataView = () => {
  const id = 'test-id';
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataView({
    spec: { id, type, version, timeFieldName, fields: JSON.parse(fields), title },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: ['_id', '_type', '_score'],
  });
};

const getTimeRange = () => {
  const date = Date.now();
  const dateStart = new Date(date - 300000).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { dateStart, dateEnd };
};

const defaultParams: OnlySearchSourceRuleParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.LT,
  threshold: [0],
  searchConfiguration: {},
  searchType: 'searchSource',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
  // this should be ignored when using a data view
  timeField: 'timeFieldNotFromDataView',
};

const logger = loggerMock.create();
const mockRuleResultService = publicRuleResultServiceMock.create();

describe('fetchSearchSourceQuery', () => {
  const dataViewMock = createDataView();

  afterAll(() => {
    jest.clearAllMocks();
  });

  const fakeNow = new Date('2020-02-09T23:15:41.941Z');

  beforeAll(() => {
    jest.resetAllMocks();
    global.Date.now = jest.fn(() => fakeNow.getTime());
  });

  describe('updateSearchSource', () => {
    it('without latest timestamp', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { searchSource, filterToExcludeHitsFromPreviousRun } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        undefined,
        dateStart,
        dateEnd,
        logger
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(filterToExcludeHitsFromPreviousRun).toBe(null);
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('with latest timestamp in between the given time range ', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { searchSource, filterToExcludeHitsFromPreviousRun } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd,
        logger
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.track_total_hits).toBe(true);
      expect(filterToExcludeHitsFromPreviousRun).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "field": "time",
            "index": "test-id",
            "params": Object {},
          },
          "query": Object {
            "range": Object {
              "time": Object {
                "format": "strict_date_optional_time",
                "gt": "2020-02-09T23:12:41.941Z",
              },
            },
          },
        }
      `);
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gt": "2020-02-09T23:12:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('with latest timestamp in before the given time range ', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { searchSource, filterToExcludeHitsFromPreviousRun } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-01-09T22:12:41.941Z',
        dateStart,
        dateEnd,
        logger
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(filterToExcludeHitsFromPreviousRun).toBe(null);
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('does not add time range if excludeHitsFromPreviousRun is false', async () => {
      const params = { ...defaultParams, excludeHitsFromPreviousRun: false };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { searchSource, filterToExcludeHitsFromPreviousRun } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd,
        logger
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(filterToExcludeHitsFromPreviousRun).toBe(null);
      expect(searchRequest.size).toMatchInlineSnapshot(`100`);
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(searchRequest.aggs).toMatchInlineSnapshot(`Object {}`);
    });

    it('should set size: 0 and top hits size to size parameter if grouping alerts', async () => {
      const params = {
        ...defaultParams,
        excludeHitsFromPreviousRun: false,
        groupBy: 'top',
        termField: 'host.name',
        termSize: 10,
      };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { searchSource } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd,
        logger
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.track_total_hits).toBeUndefined();
      expect(searchRequest.size).toMatchInlineSnapshot(`0`);
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(searchRequest.aggs).toMatchInlineSnapshot(`
        Object {
          "groupAgg": Object {
            "aggs": Object {
              "conditionSelector": Object {
                "bucket_selector": Object {
                  "buckets_path": Object {
                    "compareValue": "_count",
                  },
                  "script": "params.compareValue < 0L",
                },
              },
              "topHitsAgg": Object {
                "top_hits": Object {
                  "size": 100,
                },
              },
            },
            "terms": Object {
              "field": "host.name",
              "size": 10,
            },
          },
          "groupAggCount": Object {
            "stats_bucket": Object {
              "buckets_path": "groupAgg._count",
            },
          },
        }
      `);
    });

    it('should log if group by and top hits size is too large', async () => {
      const params = {
        ...defaultParams,
        excludeHitsFromPreviousRun: false,
        groupBy: 'top',
        termField: 'host.name',
        termSize: 10,
        size: 200,
      };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { searchSource } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd,
        logger
      );
      const searchRequest = searchSource.getSearchRequestBody();
      expect(searchRequest.track_total_hits).toBeUndefined();
      expect(searchRequest.size).toMatchInlineSnapshot(`0`);
      expect(searchRequest.query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "time": Object {
                    "format": "strict_date_optional_time",
                    "gte": "2020-02-09T23:10:41.941Z",
                    "lte": "2020-02-09T23:15:41.941Z",
                  },
                },
              },
            ],
            "must": Array [],
            "must_not": Array [],
            "should": Array [],
          },
        }
      `);
      expect(searchRequest.aggs).toMatchInlineSnapshot(`
        Object {
          "groupAgg": Object {
            "aggs": Object {
              "conditionSelector": Object {
                "bucket_selector": Object {
                  "buckets_path": Object {
                    "compareValue": "_count",
                  },
                  "script": "params.compareValue < 0L",
                },
              },
              "topHitsAgg": Object {
                "top_hits": Object {
                  "size": 100,
                },
              },
            },
            "terms": Object {
              "field": "host.name",
              "size": 10,
            },
          },
          "groupAggCount": Object {
            "stats_bucket": Object {
              "buckets_path": "groupAgg._count",
            },
          },
        }
      `);
      expect(logger.warn).toHaveBeenCalledWith('Top hits size is capped at 100');
    });

    it('should bubble up CCS errors stored in the _shards field of the search result', async () => {
      const response = {
        took: 16,
        timed_out: false,
        _shards: {
          total: 51,
          successful: 48,
          skipped: 48,
          failed: 3,
          failures: [
            {
              shard: 0,
              index: 'ccs-index',
              node: '8jMc8jz-Q6qFmKZXfijt-A',
              reason: {
                type: 'illegal_argument_exception',
                reason:
                  "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
              },
            },
          ],
        },
        hits: {
          total: {
            value: 0,
            relation: 'eq',
          },
          max_score: 0,
          hits: [],
        },
      };

      (searchSourceInstanceMock.getField as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(dataViewMock)
      );
      (searchSourceInstanceMock.setField as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(undefined)
      );
      (searchSourceInstanceMock.createChild as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(searchSourceInstanceMock)
      );
      (searchSourceInstanceMock.fetch as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(response)
      );

      // const searchSourceInstance = createSearchSourceMock({}, response);
      searchSourceCommonMock.createLazy.mockResolvedValueOnce(searchSourceInstanceMock);

      await fetchSearchSourceQuery({
        ruleId: 'abc',
        params: defaultParams,
        services: {
          logger,
          getSearchSourceClient: async () => searchSourceCommonMock,
          ruleResultService: mockRuleResultService,
          share: {
            url: {
              // @ts-expect-error
              locators: {
                get: jest.fn().mockReturnValue({
                  getRedirectUrl: jest.fn(() => '/app/r?l=DISCOVER_APP_LOCATOR'),
                } as unknown as LocatorPublic<DiscoverAppLocatorParams>),
              },
            },
          },
          getDataViews: async () => {
            return {
              ...dataViewPluginMocks.createStartContract(),
              create: async (spec: DataViewSpec) =>
                new DataView({ spec, fieldFormats: fieldFormatsMock }),
            };
          },
        },
        spacePrefix: '',
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
      });

      expect(mockRuleResultService.addLastRunWarning).toHaveBeenCalledWith(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
      expect(mockRuleResultService.setLastRunOutcomeMessage).toHaveBeenCalledWith(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
    });

    it('should bubble up CCS errors stored in the _clusters field of the search result', async () => {
      const response = {
        took: 6,
        timed_out: false,
        num_reduce_phases: 0,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        _clusters: {
          total: 1,
          successful: 0,
          skipped: 1,
          running: 0,
          partial: 0,
          failed: 0,
          details: {
            test: {
              status: 'skipped',
              indices: '.kibana-event-log*',
              timed_out: false,
              failures: [
                {
                  shard: -1,
                  index: null,
                  reason: {
                    type: 'search_phase_execution_exception',
                    reason: 'all shards failed',
                    phase: 'query',
                    grouped: true,
                    failed_shards: [
                      {
                        shard: 0,
                        index: 'test:.ds-.kibana-event-log-ds-2024.07.31-000001',
                        node: 'X1aMu4BpQR-7PHi-bEI8Fw',
                        reason: {
                          type: 'illegal_argument_exception',
                          reason:
                            "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                        },
                      },
                    ],
                    caused_by: {
                      type: '',
                      reason:
                        "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                      caused_by: {
                        type: 'illegal_argument_exception',
                        reason:
                          "Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.",
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
      };

      (searchSourceInstanceMock.getField as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(dataViewMock)
      );
      (searchSourceInstanceMock.setField as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(undefined)
      );
      (searchSourceInstanceMock.createChild as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(searchSourceInstanceMock)
      );
      (searchSourceInstanceMock.fetch as jest.Mock).mockImplementationOnce(
        jest.fn().mockReturnValue(response)
      );

      // const searchSourceInstance = createSearchSourceMock({}, response);
      searchSourceCommonMock.createLazy.mockResolvedValueOnce(searchSourceInstanceMock);

      await fetchSearchSourceQuery({
        ruleId: 'abc',
        params: defaultParams,
        services: {
          logger,
          getSearchSourceClient: async () => searchSourceCommonMock,
          ruleResultService: mockRuleResultService,
          share: {
            url: {
              // @ts-expect-error
              locators: {
                get: jest.fn().mockReturnValue({
                  getRedirectUrl: jest.fn(() => '/app/r?l=DISCOVER_APP_LOCATOR'),
                } as unknown as LocatorPublic<DiscoverAppLocatorParams>),
              },
            },
          },
          getDataViews: async () => {
            return {
              ...dataViewPluginMocks.createStartContract(),
              create: async (spec: DataViewSpec) =>
                new DataView({ spec, fieldFormats: fieldFormatsMock }),
            };
          },
        },
        spacePrefix: '',
        dateStart: new Date().toISOString(),
        dateEnd: new Date().toISOString(),
      });

      expect(mockRuleResultService.addLastRunWarning).toHaveBeenCalledWith(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
      expect(mockRuleResultService.setLastRunOutcomeMessage).toHaveBeenCalledWith(
        `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
      );
    });

    it('should throw user error if data view is not found', async () => {
      searchSourceCommonMock.createLazy.mockImplementationOnce(() => {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', 'abc');
      });

      try {
        await fetchSearchSourceQuery({
          ruleId: 'abc',
          params: defaultParams,
          // @ts-expect-error
          services: {
            logger,
            getSearchSourceClient: async () => searchSourceCommonMock,
          },
          spacePrefix: '',
          dateStart: new Date().toISOString(),
          dateEnd: new Date().toISOString(),
        });
      } catch (err) {
        expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
        expect(err.message).toBe('Saved object [index-pattern/abc] not found');
      }
    });

    it('should re-throw error for generic errors', async () => {
      searchSourceCommonMock.createLazy.mockImplementationOnce(() => {
        throw new Error('fail');
      });

      try {
        await fetchSearchSourceQuery({
          ruleId: 'abc',
          params: defaultParams,
          // @ts-expect-error
          services: {
            logger,
            getSearchSourceClient: async () => searchSourceCommonMock,
          },
          spacePrefix: '',
          dateStart: new Date().toISOString(),
          dateEnd: new Date().toISOString(),
        });
      } catch (err) {
        expect(getErrorSource(err)).not.toBeDefined();
        expect(err.message).toBe('fail');
      }
    });
  });

  describe('generateLink', () => {
    it('should include additional time filter', async () => {
      const params = { ...defaultParams, thresholdComparator: Comparator.GT_OR_EQ, threshold: [3] };

      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();
      const { filterToExcludeHitsFromPreviousRun } = await updateSearchSource(
        searchSourceInstance,
        dataViewMock,
        params,
        '2020-02-09T23:12:41.941Z',
        dateStart,
        dateEnd,
        logger
      );

      expect(filterToExcludeHitsFromPreviousRun).toMatchInlineSnapshot(`
        Object {
          "meta": Object {
            "field": "time",
            "index": "test-id",
            "params": Object {},
          },
          "query": Object {
            "range": Object {
              "time": Object {
                "format": "strict_date_optional_time",
                "gt": "2020-02-09T23:12:41.941Z",
              },
            },
          },
        }
      `);

      const locatorMock = {
        getRedirectUrl: jest.fn(() => '/app/r?l=DISCOVER_APP_LOCATOR'),
      } as unknown as LocatorPublic<DiscoverAppLocatorParams>;

      const dataViews = {
        ...dataViewPluginMocks.createStartContract(),
        create: async (spec: DataViewSpec) =>
          new DataView({ spec, fieldFormats: fieldFormatsMock }),
      };

      const linkWithoutExcludedRuns = await generateLink(
        searchSourceInstance,
        locatorMock,
        async () => dataViews,
        dataViewMock,
        dateStart,
        dateEnd,
        'test1',
        null
      );

      expect(linkWithoutExcludedRuns).toBe('test1/app/r?l=DISCOVER_APP_LOCATOR');
      expect(locatorMock.getRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [],
        })
      );

      const linkWithExcludedRuns = await generateLink(
        searchSourceInstance,
        locatorMock,
        async () => dataViews,
        dataViewMock,
        dateStart,
        dateEnd,
        'test2',
        filterToExcludeHitsFromPreviousRun
      );

      expect(linkWithExcludedRuns).toBe('test2/app/r?l=DISCOVER_APP_LOCATOR');
      expect(locatorMock.getRedirectUrl).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          filters: expect.arrayContaining(
            updateFilterReferences(
              [filterToExcludeHitsFromPreviousRun!],
              dataViewMock.id!,
              undefined
            )
          ),
        })
      );
    });

    it('should skip fetching fields', async () => {
      const searchSourceInstance = createSearchSourceMock({ index: dataViewMock });

      const { dateStart, dateEnd } = getTimeRange();

      const locatorMock = {
        getRedirectUrl: jest.fn(() => '/app/r?l=DISCOVER_APP_LOCATOR'),
      } as unknown as LocatorPublic<DiscoverAppLocatorParams>;

      const dataViews = {
        ...dataViewPluginMocks.createStartContract(),
        create: jest
          .fn()
          .mockImplementation(
            (spec: DataViewSpec) => new DataView({ spec, fieldFormats: fieldFormatsMock })
          ),
      };

      await generateLink(
        searchSourceInstance,
        locatorMock,
        async () => dataViews,
        dataViewMock,
        dateStart,
        dateEnd,
        'test1',
        null
      );

      expect(dataViews.create).toHaveBeenCalledWith(
        {
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: {},
          fieldFormats: {},
          id: undefined,
          name: '',
          runtimeFieldMap: {},
          sourceFilters: [],
          timeFieldName: 'time',
          title: 'title',
          type: 'index-pattern',
          version: undefined,
        },
        true // skipFetchFields flag
      );
    });
  });

  describe('getSmallerDataViewSpec', () => {
    it('should remove "count"s but keep other props like "customLabel"', async () => {
      const fieldsMap = {
        test1: {
          name: 'test1',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test2: {
          name: 'test2',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
        test3: {
          name: 'test3',
          type: 'keyword',
          aggregatable: true,
          searchable: true,
          readFromDocValues: false,
        },
      };
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: undefined,
            },
          })
        )?.fieldAttrs
      ).toBeUndefined();
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: {
                test1: {
                  count: 11,
                },
                test2: {
                  count: 12,
                },
              },
            },
          })
        )?.fieldAttrs
      ).toBeUndefined();
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: {
                test1: {
                  count: 11,
                  customLabel: 'test11',
                },
                test2: {
                  count: 12,
                },
              },
            },
          })
        )?.fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
        }
      `);
      expect(
        getSmallerDataViewSpec(
          createStubDataView({
            spec: {
              id: 'test',
              title: 'test*',
              fields: fieldsMap,
              fieldAttrs: {
                test1: {
                  count: 11,
                  customLabel: 'test11',
                },
                test2: {
                  customLabel: 'test12',
                },
                test3: {
                  count: 30,
                  customDescription: 'test3',
                },
              },
            },
          })
        )?.fieldAttrs
      ).toMatchInlineSnapshot(`
        Object {
          "test1": Object {
            "customLabel": "test11",
          },
          "test2": Object {
            "customLabel": "test12",
          },
        }
      `);
    });
  });
});
