/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TableView } from './table_model';
import { tableSnapshotHeight } from './table_snapshot_height';

const columns: TableView['columns'] = [
  { label: 'Service', align: 'left' },
  { label: 'Message', align: 'left' },
];

describe('tableSnapshotHeight', () => {
  it('adds a row height for each row', () => {
    const one = tableSnapshotHeight({ columns, rows: [['checkout', 'ok']] });
    const two = tableSnapshotHeight({
      columns,
      rows: [
        ['checkout', 'ok'],
        ['search', 'ok'],
      ],
    });

    expect(two).toBeGreaterThan(one);
  });

  it('gives a long cell the width its narrow neighbors leave', () => {
    const long = 'Checkout latency doubled after the deploy. '.repeat(3);
    const twoColumns = tableSnapshotHeight({ columns, rows: [['checkout', long]] });
    const evenSplit = tableSnapshotHeight({
      columns: [...columns, { label: 'Note', align: 'left' }],
      rows: [['checkout', long, long]],
    });

    expect(twoColumns).toBeLessThan(evenSplit);
  });

  it('adds the note when rows were cut', () => {
    expect(
      tableSnapshotHeight({ columns, rows: [['a', 'b']], note: 'Showing 1 of 240 rows' })
    ).toBeGreaterThan(tableSnapshotHeight({ columns, rows: [['a', 'b']] }));
  });
});
