/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { pagesToDatatableRecords } from './pages_to_datatable_records';

describe('pagesToDatatableRecords', () => {
  it('should return an empty array when no pages are provided', () => {
    const result = pagesToDatatableRecords();
    expect(result).toEqual([]);
  });

  it('should return an empty array when an empty array of pages is provided', () => {
    const result = pagesToDatatableRecords([]);
    expect(result).toEqual([]);
  });

  it('should convert a single page with rows into DataTableRecords', () => {
    const samplePage = {
      type: 'datatable',
      columns: [],
      rows: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
    } as Datatable;
    const result = pagesToDatatableRecords([samplePage]);

    expect(result).toEqual([
      { id: '0', raw: { a: 1, b: 2 }, flattened: { a: 1, b: 2 } },
      { id: '1', raw: { a: 3, b: 4 }, flattened: { a: 3, b: 4 } },
    ]);
  });

  it('should flatten and combine rows from multiple pages into DataTableRecords', () => {
    const pages = [
      {
        type: 'datatable',
        columns: [],
        rows: [{ x: 10, y: 20 }],
      },
      {
        type: 'datatable',
        columns: [],
        rows: [{ x: 30, y: 40 }],
      },
    ] as Datatable[];
    const result = pagesToDatatableRecords(pages);

    expect(result).toEqual([
      { id: '0', raw: { x: 10, y: 20 }, flattened: { x: 10, y: 20 } },
      { id: '1', raw: { x: 30, y: 40 }, flattened: { x: 30, y: 40 } },
    ]);
  });

  it('should handle pages with no rows and skip them', () => {
    const pages = [
      {
        type: 'datatable',
        columns: [],
        rows: [],
      },
      {
        type: 'datatable',
        columns: [],
        rows: [{ key: 'value' }],
      },
    ] as Datatable[];
    const result = pagesToDatatableRecords(pages);

    expect(result).toEqual([{ id: '0', raw: { key: 'value' }, flattened: { key: 'value' } }]);
  });
});
