/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnlyEsQueryRuleParams } from '../types';
import { Comparator } from '../../../../common/comparator_types';
import { fetchEsQuery, generateLink } from './fetch_es_query';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { publicRuleResultServiceMock } from '@kbn/alerting-plugin/server/monitoring/rule_result_service.mock';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';

jest.mock('@kbn/triggers-actions-ui-plugin/common', () => {
  const actual = jest.requireActual('@kbn/triggers-actions-ui-plugin/common');
  return {
    ...actual,
    parseAggregationResults: jest.fn(),
  };
});

const mockNow = jest.getRealSystemTime();
const defaultParams: OnlyEsQueryRuleParams = {
  index: ['test-index'],
  size: 100,
  timeField: '@timestamp',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.LT,
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
};

const logger = loggerMock.create();
const scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
const mockRuleResultService = publicRuleResultServiceMock.create();

describe('fetchEsQuery', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  const services = {
    // @ts-expect-error
    share: {
      url: {
        locators: {
          get: jest.fn().mockReturnValue({
            getRedirectUrl: jest.fn(() => '/app/r?l=DISCOVER_APP_LOCATOR'),
          } as unknown as LocatorPublic<DiscoverAppLocatorParams>),
        },
      },
    } as SharePluginStart,
    scopedClusterClient: scopedClusterClientMock,
    logger,
    ruleResultService: mockRuleResultService,
  };
  it('should add time filter if timestamp if defined and excludeHitsFromPreviousRun is true', async () => {
    const params = defaultParams;
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: '2020-02-09T23:15:41.941Z',
      services,
      spacePrefix: '',
      dateStart: date,
      dateEnd: date,
      sourceFields: [],
      alertLimit: 100,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        aggs: {},
        docvalue_fields: [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  filter: [
                    {
                      match_all: {},
                    },
                    {
                      bool: {
                        must_not: [
                          {
                            bool: {
                              filter: [
                                {
                                  range: {
                                    '@timestamp': {
                                      format: 'strict_date_optional_time',
                                      lte: '2020-02-09T23:15:41.941Z',
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: date,
                          lte: date,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'desc',
            },
          },
        ],
        ignore_unavailable: true,
        index: ['test-index'],
        size: 100,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should not add time filter if timestamp is undefined', async () => {
    const params = defaultParams;
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: undefined,
      services,
      spacePrefix: '',
      dateStart: date,
      dateEnd: date,
      sourceFields: [],
      alertLimit: 100,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        aggs: {},
        docvalue_fields: [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                match_all: {},
              },
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: date,
                          lte: date,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'desc',
            },
          },
        ],
        ignore_unavailable: true,
        index: ['test-index'],
        size: 100,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should not add time filter if excludeHitsFromPreviousRun is false', async () => {
    const params = { ...defaultParams, excludeHitsFromPreviousRun: false };
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: '2020-02-09T23:15:41.941Z',
      services,
      spacePrefix: '',
      dateStart: date,
      dateEnd: date,
      sourceFields: [],
      alertLimit: 100,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        aggs: {},
        docvalue_fields: [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                match_all: {},
              },
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: date,
                          lte: date,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'desc',
            },
          },
        ],
        ignore_unavailable: true,
        index: ['test-index'],
        size: 100,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should set size: 0 and top hits size to size parameter if grouping alerts', async () => {
    const params = { ...defaultParams, groupBy: 'top', termField: 'host.name', termSize: 10 };
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: undefined,
      services,
      spacePrefix: '',
      dateStart: date,
      dateEnd: date,
      sourceFields: [],
      alertLimit: 100,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        aggs: {
          groupAgg: {
            aggs: {
              conditionSelector: {
                bucket_selector: {
                  buckets_path: {
                    compareValue: '_count',
                  },
                  script: 'params.compareValue < 0L',
                },
              },
              topHitsAgg: {
                top_hits: {
                  size: 100,
                },
              },
            },
            terms: {
              field: 'host.name',
              size: 10,
            },
          },
          groupAggCount: {
            stats_bucket: {
              buckets_path: 'groupAgg._count',
            },
          },
        },
        docvalue_fields: [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                match_all: {},
              },
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: date,
                          lte: date,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'desc',
            },
          },
        ],
        ignore_unavailable: true,
        index: ['test-index'],
        size: 0,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should log if group by and top hits size is too large', async () => {
    const params = {
      ...defaultParams,
      groupBy: 'top',
      termField: 'host.name',
      termSize: 10,
      size: 200,
    };
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: undefined,
      services,
      spacePrefix: '',
      dateStart: date,
      dateEnd: date,
      sourceFields: [],
      alertLimit: 100,
    });
    expect(logger.warn).toHaveBeenCalledWith(`Top hits size is capped at 100`);
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        aggs: {
          groupAgg: {
            aggs: {
              conditionSelector: {
                bucket_selector: {
                  buckets_path: {
                    compareValue: '_count',
                  },
                  script: 'params.compareValue < 0L',
                },
              },
              topHitsAgg: {
                top_hits: {
                  size: 100,
                },
              },
            },
            terms: {
              field: 'host.name',
              size: 10,
            },
          },
          groupAggCount: {
            stats_bucket: {
              buckets_path: 'groupAgg._count',
            },
          },
        },
        docvalue_fields: [
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                match_all: {},
              },
              {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          format: 'strict_date_optional_time',
                          gte: date,
                          lte: date,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              format: 'strict_date_optional_time||epoch_millis',
              order: 'desc',
            },
          },
        ],
        ignore_unavailable: true,
        index: ['test-index'],
        size: 0,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should bubble up CCS errors stored in the _shards field of the search result', async () => {
    scopedClusterClientMock.asCurrentUser.search.mockResolvedValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params: defaultParams,
      timestamp: '2020-02-09T23:15:41.941Z',
      services,
      spacePrefix: '',
      dateStart: new Date().toISOString(),
      dateEnd: new Date().toISOString(),
      sourceFields: [],
      alertLimit: 100,
    });

    expect(mockRuleResultService.addLastRunWarning).toHaveBeenCalledWith(
      `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
    );
    expect(mockRuleResultService.setLastRunOutcomeMessage).toHaveBeenCalledWith(
      `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
    );
  });

  it('should bubble up CCS errors stored in the _clusters field of the search result', async () => {
    scopedClusterClientMock.asCurrentUser.search.mockResolvedValueOnce(
      // @ts-expect-error - _clusters.details not a valid response but it is irl
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params: defaultParams,
      timestamp: '2020-02-09T23:15:41.941Z',
      services,
      spacePrefix: '',
      dateStart: new Date().toISOString(),
      dateEnd: new Date().toISOString(),
      sourceFields: [],
      alertLimit: 100,
    });

    expect(mockRuleResultService.addLastRunWarning).toHaveBeenCalledWith(
      `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
    );
    expect(mockRuleResultService.setLastRunOutcomeMessage).toHaveBeenCalledWith(
      `Top hits result window is too large, the top hits aggregator [topHitsAgg]'s from + size must be less than or equal to: [100] but was [300]. This limit can be set by changing the [index.max_inner_result_window] index level setting.`
    );
  });

  it('should generate a link', () => {
    const date = '2020-02-09T23:15:41.941Z';
    const locatorMock = {
      getRedirectUrl: jest.fn(() => 'space1/app/r?l=DISCOVER_APP_LOCATOR'),
    } as unknown as LocatorPublic<DiscoverAppLocatorParams>;
    const filter = {
      bool: {
        filter: [
          { match_all: {} },
          {
            bool: {
              must_not: [
                {
                  bool: {
                    filter: [
                      {
                        range: {
                          '@timestamp': {
                            lte: date,
                            format: 'strict_date_optional_time',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const link = generateLink(defaultParams, filter, locatorMock, date, date, 'space1');

    expect(link).toBe('space1/app/r?l=DISCOVER_APP_LOCATOR');
    expect(locatorMock.getRedirectUrl).toHaveBeenCalledWith(
      {
        dataViewSpec: {
          id: 'es_query_rule_adhoc_data_view',
          timeFieldName: '@timestamp',
          title: 'test-index',
        },
        filters: [
          {
            $state: { store: 'appState' },
            bool: {
              filter: [
                { match_all: {} },
                {
                  bool: {
                    must_not: [
                      {
                        bool: {
                          filter: [
                            {
                              range: {
                                '@timestamp': {
                                  format: 'strict_date_optional_time',
                                  lte: '2020-02-09T23:15:41.941Z',
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
            meta: {
              alias: 'Rule query DSL',
              disabled: false,
              index: 'es_query_rule_adhoc_data_view',
              negate: false,
              type: 'custom',
            },
          },
        ],
        isAlertResults: true,
        timeRange: { from: '2020-02-09T23:15:41.941Z', to: '2020-02-09T23:15:41.941Z' },
      },
      { spaceId: 'space1' }
    );
  });
});
