/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { MAX_FIELD_VALUE_OPTIONS } from '../../common/constants';
import type { EsqlResponse } from '../../common/types';
import { runEsql } from './esql';
import { getFieldValues } from './fields';

jest.mock('./esql');

const runEsqlMock = jest.mocked(runEsql);
const INDEX = '.kibana-event-log-ds';

function mockValues(values: EsqlResponse['values']) {
  runEsqlMock.mockReset();
  runEsqlMock.mockImplementation(async ({ body: { query } }) =>
    query.endsWith('| LIMIT 0')
      ? {
          isPartial: false,
          columns: [
            { name: 'event.outcome', type: 'keyword' },
            { name: 'message', type: 'text' },
          ],
          values: [],
        }
      : {
          isPartial: false,
          columns: [
            { name: '__count', type: 'long' },
            { name: 'event.outcome', type: 'keyword' },
          ],
          values,
        }
  );
}

describe('getFieldValues', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  it('lists distinct values with counts, sorted by value', async () => {
    mockValues([
      [3, 'failure'],
      [40, 'success'],
    ]);

    expect(await getFieldValues({ esClient, index: INDEX, field: 'event.outcome' })).toEqual({
      values: [
        { value: 'failure', label: 'failure', count: 3 },
        { value: 'success', label: 'success', count: 40 },
      ],
      complete: true,
    });
    expect(runEsqlMock.mock.calls[1][0].body.query).toBe(
      [
        `FROM ${INDEX}`,
        '| WHERE `event.outcome` IS NOT NULL',
        '| STATS __count = COUNT(*) BY `event.outcome`',
        '| SORT `event.outcome` ASC',
        `| LIMIT ${MAX_FIELD_VALUE_OPTIONS + 1}`,
      ].join('\n')
    );
  });

  it('reports incomplete when there are too many values', async () => {
    mockValues(Array.from({ length: MAX_FIELD_VALUE_OPTIONS + 1 }, (_, i) => [1, `v${i}`]));

    expect(await getFieldValues({ esClient, index: INDEX, field: 'event.outcome' })).toEqual({
      values: [],
      complete: false,
    });
  });

  it('skips text and unknown fields without querying values', async () => {
    mockValues([]);

    for (const field of ['message', 'nope']) {
      expect(await getFieldValues({ esClient, index: INDEX, field })).toEqual({
        values: [],
        complete: false,
      });
    }
    expect(runEsqlMock).toHaveBeenCalledTimes(2);
  });
});
