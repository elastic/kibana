/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnlyEsqlQueryRuleParams } from '../types';
import { Comparator } from '../../../../common/comparator_types';
import { fetchEsqlQuery, getEsqlQuery, getSourceFields, generateLink } from './fetch_esql_query';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { publicRuleResultServiceMock } from '@kbn/alerting-plugin/server/monitoring/rule_result_service.mock';
import { getEsqlQueryHits } from '../../../../common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';

const getTimeRange = () => {
  const date = Date.now();
  const dateStart = new Date(date - 300000).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { dateStart, dateEnd };
};

const defaultParams: OnlyEsqlQueryRuleParams = {
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.GT,
  threshold: [0],
  esqlQuery: { esql: 'from test' },
  excludeHitsFromPreviousRun: false,
  searchType: 'esqlQuery',
  aggType: 'count',
  groupBy: 'all',
  timeField: 'time',
};

jest.mock('../../../../common', () => {
  const original = jest.requireActual('../../../../common');
  return {
    ...original,
    getEsqlQueryHits: jest.fn(),
  };
});

const logger = loggingSystemMock.create().get();
const mockRuleResultService = publicRuleResultServiceMock.create();

describe('fetchEsqlQuery', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  const fakeNow = new Date('2020-02-09T23:15:41.941Z');

  beforeAll(() => {
    jest.resetAllMocks();
    global.Date.now = jest.fn(() => fakeNow.getTime());
  });

  describe('fetch', () => {
    it('should throw a user error when the error is a verification_exception error', async () => {
      const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();

      scopedClusterClient.asCurrentUser.transport.request.mockRejectedValueOnce(
        new Error(
          'verification_exception: Found 1 problem line 1:23: Unknown column [user_agent.original]'
        )
      );

      try {
        await fetchEsqlQuery({
          ruleId: 'testRuleId',
          alertLimit: 1,
          params: defaultParams,
          services: {
            logger,
            scopedClusterClient,
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
            ruleResultService: mockRuleResultService,
          },
          spacePrefix: '',
          dateStart: new Date().toISOString(),
          dateEnd: new Date().toISOString(),
        });
      } catch (e) {
        expect(getErrorSource(e)).toBe(TaskErrorSource.USER);
      }
    });
  });

  describe('getEsqlQuery', () => {
    it('should generate the correct query', async () => {
      const params = defaultParams;
      const { dateStart, dateEnd } = getTimeRange();
      const query = getEsqlQuery(params, undefined, dateStart, dateEnd);

      expect(query).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "range": Object {
                    "time": Object {
                      "format": "strict_date_optional_time",
                      "gt": "2020-02-09T23:10:41.941Z",
                      "lte": "2020-02-09T23:15:41.941Z",
                    },
                  },
                },
              ],
            },
          },
          "query": "from test",
        }
      `);
    });

    it('should generate the correct query with the alertLimit', async () => {
      const params = defaultParams;
      const { dateStart, dateEnd } = getTimeRange();
      const query = getEsqlQuery(params, 100, dateStart, dateEnd);

      expect(query).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "range": Object {
                    "time": Object {
                      "format": "strict_date_optional_time",
                      "gt": "2020-02-09T23:10:41.941Z",
                      "lte": "2020-02-09T23:15:41.941Z",
                    },
                  },
                },
              ],
            },
          },
          "query": "from test | limit 100",
        }
      `);
    });
  });

  describe('getSourceFields', () => {
    it('should generate the correct source fields', async () => {
      const sourceFields = getSourceFields({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'ecs.version', type: 'keyword' },
          { name: 'error.code', type: 'keyword' },
        ],
        values: [['2023-07-12T13:32:04.174Z', '1.8.0', null]],
      });

      expect(sourceFields).toMatchInlineSnapshot(`
        Array [
          Object {
            "label": "ecs.version",
            "searchPath": "ecs.version",
          },
          Object {
            "label": "error.code",
            "searchPath": "error.code",
          },
        ]
      `);
    });
  });

  it('should bubble up warnings if there are duplicate alerts', async () => {
    const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    scopedClusterClient.asCurrentUser.transport.request.mockResolvedValueOnce({
      columns: [],
      values: [],
    });

    (getEsqlQueryHits as jest.Mock).mockReturnValue({
      results: {
        esResult: {
          _shards: { failed: 0, successful: 0, total: 0 },
          aggregations: {
            groupAgg: {
              buckets: [
                {
                  doc_count: 1,
                  key: '1.8.0',
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: '1.8.0',
                          _index: '',
                          _source: {
                            '@timestamp': '2023-07-12T13:32:04.174Z',
                            'ecs.version': '1.8.0',
                            'error.code': null,
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  doc_count: 2,
                  key: '1.2.0',
                  topHitsAgg: {
                    hits: {
                      hits: [
                        {
                          _id: '1.2.0',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '400',
                          },
                        },
                        {
                          _id: '1.2.0',
                          _index: '',
                          _source: {
                            '@timestamp': '2025-07-12T13:32:04.174Z',
                            'ecs.version': '1.2.0',
                            'error.code': '200',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
          hits: { hits: [] },
          timed_out: false,
          took: 0,
        },
        isCountAgg: false,
        isGroupAgg: true,
      },
      duplicateAlertIds: new Set<string>(['1.2.0']),
    });

    await fetchEsqlQuery({
      ruleId: 'testRuleId',
      alertLimit: 1,
      params: defaultParams,
      services: {
        logger,
        scopedClusterClient,
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
        ruleResultService: mockRuleResultService,
      },
      spacePrefix: '',
      dateStart: new Date().toISOString(),
      dateEnd: new Date().toISOString(),
    });

    expect(mockRuleResultService.addLastRunWarning).toHaveBeenCalledWith(
      'The query returned multiple rows with the same alert ID. There are duplicate results for alert IDs: 1.2.0'
    );
    expect(mockRuleResultService.setLastRunOutcomeMessage).toHaveBeenCalledWith(
      'The query returned multiple rows with the same alert ID. There are duplicate results for alert IDs: 1.2.0'
    );
  });
  describe('generateLink', () => {
    it('should generate a link', () => {
      const { dateStart, dateEnd } = getTimeRange();
      const locatorMock = {
        getRedirectUrl: jest.fn(() => 'space1/app/r?l=DISCOVER_APP_LOCATOR'),
      } as unknown as LocatorPublic<DiscoverAppLocatorParams>;

      const link = generateLink(defaultParams, locatorMock, dateStart, dateEnd, 'space1');

      expect(link).toBe('space1/app/r?l=DISCOVER_APP_LOCATOR');
      expect(locatorMock.getRedirectUrl).toHaveBeenCalledWith(
        {
          isAlertResults: true,
          query: { esql: 'from test' },
          timeRange: { from: '2020-02-09T23:10:41.941Z', to: '2020-02-09T23:15:41.941Z' },
        },
        { spaceId: 'space1' }
      );
    });
  });
});
