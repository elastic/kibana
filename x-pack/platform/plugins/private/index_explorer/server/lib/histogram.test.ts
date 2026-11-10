/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { runEsql } from './esql';
import { pickInterval } from '../../common/histogram_interval';
import { getHistogram } from './histogram';

jest.mock('./esql');

const runEsqlMock = jest.mocked(runEsql);
const INDEX = '.kibana-event-log-ds';
const HOUR = 60 * 60 * 1000;

describe('pickInterval', () => {
  it('picks the smallest interval within the target bucket count', () => {
    expect(pickInterval(0).literal).toBe('1 second');
    expect(pickInterval(HOUR).literal).toBe('1 minute');
    expect(pickInterval(24 * HOUR).literal).toBe('30 minutes');
    expect(pickInterval(1000 * 365 * 24 * HOUR).literal).toBe('1 year');
  });
});

describe('getHistogram', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => runEsqlMock.mockReset());

  it('buckets the filtered documents over @timestamp', async () => {
    runEsqlMock.mockImplementation(async ({ body: { query } }) => {
      if (query.endsWith('| LIMIT 0')) {
        return {
          isPartial: false,
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'event.provider', type: 'keyword' },
          ],
          values: [],
        };
      }
      if (query.includes('MIN(')) {
        return {
          isPartial: false,
          columns: [
            { name: '__min', type: 'date' },
            { name: '__max', type: 'date' },
          ],
          values: [['2026-11-03T03:00:00.000Z', '2026-11-03T04:00:00.000Z']],
        };
      }
      return {
        isPartial: false,
        columns: [
          { name: '__count', type: 'long' },
          { name: '__bucket', type: 'date' },
        ],
        values: [[5, '2026-11-03T03:00:00.000Z']],
      };
    });

    const result = await getHistogram({
      esClient,
      index: INDEX,
      filters: [{ field: 'event.provider', operator: 'exact', value: 'taskManager' }],
    });

    expect(result).toEqual({
      field: '@timestamp',
      intervalMs: 60 * 1000,
      buckets: [{ timestamp: Date.parse('2026-11-03T03:00:00.000Z'), count: 5 }],
      esql: {
        query: [
          `FROM ${INDEX}`,
          '| WHERE `event.provider` == ?p0',
          '| STATS __count = COUNT(*) BY __bucket = BUCKET(`@timestamp`, 1 minute)',
          '| SORT __bucket ASC',
        ].join('\n'),
        params: [{ name: 'p0', type: 'string', value: 'taskManager' }],
      },
    });
  });

  it('returns no buckets when there is no @timestamp field', async () => {
    runEsqlMock.mockResolvedValue({
      isPartial: false,
      columns: [{ name: 'name', type: 'keyword' }],
      values: [],
    });

    expect(await getHistogram({ esClient, index: 'plain', filters: [] })).toEqual({
      buckets: [],
    });
    expect(runEsqlMock).toHaveBeenCalledTimes(1);
  });
});
