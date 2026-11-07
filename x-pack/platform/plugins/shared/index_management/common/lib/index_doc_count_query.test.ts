/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIndexDocCountQuery, toIndexDocCounts } from './index_doc_count_query';

const COLUMNS = [
  { name: 'count()', type: 'long' },
  { name: '_index', type: 'keyword' },
];

describe('WHEN building the index doc count query', () => {
  it('SHOULD quote every index name as its own source', () => {
    expect(buildIndexDocCountQuery(['logs', 'a"b', 'c\\d'])).toBe(
      'FROM "logs","a\\"b","c\\\\d" METADATA _index | STATS count() BY _index'
    );
  });
});

describe('WHEN mapping the index doc count result', () => {
  it('SHOULD read counts by column name', () => {
    expect(
      toIndexDocCounts(
        {
          columns: COLUMNS,
          values: [
            [3, 'logs'],
            [1, 'metrics'],
          ],
        },
        ['logs', 'metrics']
      )
    ).toEqual({ logs: 3, metrics: 1 });
  });

  it('SHOULD count requested indices without documents as 0', () => {
    expect(
      toIndexDocCounts({ columns: COLUMNS, values: [[3, 'logs']] }, ['logs', 'empty'])
    ).toEqual({ logs: 3, empty: 0 });
  });

  it('SHOULD skip rows without an index name or count', () => {
    expect(
      toIndexDocCounts(
        {
          columns: COLUMNS,
          values: [
            [null, 'logs'],
            [2, null],
          ],
        },
        ['logs']
      )
    ).toEqual({ logs: 0 });
  });
});
