/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClickedRow } from './clicked_row';

const table = {
  columns: [
    { id: 'user_name', name: 'user.name' },
    { id: 'outcome', name: 'event.outcome' },
    { id: 'count', name: 'count' },
  ],
  rows: [
    { user_name: 'alice', outcome: 'success', count: 4 },
    { user_name: 'bob', outcome: 'failure', count: 9 },
  ],
};

describe('the row that was clicked on a chart', () => {
  it('is the row of the table behind the bar, by the names of its columns', () => {
    expect(getClickedRow({ data: [{ table, column: 0, row: 1, value: 'bob' }] })).toEqual({
      'user.name': 'bob',
      'event.outcome': 'failure',
      count: 9,
    });
  });

  it('has the series as well as the bar, when the chart is split by one', () => {
    const row = getClickedRow({ data: [{ table, column: 2, row: 0, value: 4 }] });

    expect(row).toMatchObject({ 'user.name': 'alice', 'event.outcome': 'success' });
  });

  it('is found when several cells were clicked, by the first of them', () => {
    expect(
      getClickedRow({
        data: [
          {
            table,
            cells: [
              { column: 0, row: 1 },
              { column: 1, row: 1 },
            ],
          },
        ],
      })
    ).toMatchObject({ 'user.name': 'bob' });
  });

  it('keeps a value that has several values in it, as a column can', () => {
    const multi = {
      columns: [{ id: 'tags', name: 'tags' }],
      rows: [{ tags: ['a', 'b'] }],
    };

    expect(getClickedRow({ data: [{ table: multi, column: 0, row: 0 }] })).toEqual({
      tags: ['a', 'b'],
    });
  });

  it('is nothing when the click does not say which row, or the row is not in the table', () => {
    expect(getClickedRow(undefined)).toBeUndefined();
    expect(getClickedRow({ data: [] })).toBeUndefined();
    expect(getClickedRow({ data: [{ table, column: 0 }] })).toBeUndefined();
    expect(getClickedRow({ data: [{ table, column: 0, row: 7 }] })).toBeUndefined();
  });

  it('leaves out a column that the row has no value for', () => {
    const sparse = { columns: table.columns, rows: [{ user_name: 'alice' }] };

    expect(getClickedRow({ data: [{ table: sparse, column: 0, row: 0 }] })).toEqual({
      'user.name': 'alice',
    });
  });
});
