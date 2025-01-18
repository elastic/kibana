/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsqlQueryRuleParams } from '../types';
import { Comparator } from '../../../../common/comparator_types';
import { fetchEsqlQuery, getEsqlQuery, getSourceFields } from './fetch_esql_query';
import { getErrorSource, TaskErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

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
const logger = loggingSystemMock.create().get();

describe('fetchEsqlQuery', () => {
  describe('fetch', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });
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
            share: {} as SharePluginStart,
          },
          spacePrefix: '',
          publicBaseUrl: '',
          dateStart: new Date().toISOString(),
          dateEnd: new Date().toISOString(),
        });
      } catch (e) {
        expect(getErrorSource(e)).toBe(TaskErrorSource.USER);
      }
    });
  });

  describe('getEsqlQuery', () => {
    afterAll(() => {
      jest.resetAllMocks();
    });

    const fakeNow = new Date('2020-02-09T23:15:41.941Z');

    beforeAll(() => {
      jest.resetAllMocks();
      global.Date.now = jest.fn(() => fakeNow.getTime());
    });

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
});
