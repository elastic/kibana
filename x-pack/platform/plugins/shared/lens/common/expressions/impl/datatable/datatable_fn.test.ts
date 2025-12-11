/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
} from '@kbn/expressions-plugin/common';
import type { DatatableArgs } from '../..';
import { datatableFn } from './datatable_fn';
import { shuffle } from 'lodash';

const context = {
  variables: { embeddableTitle: 'title' },
} as unknown as ExecutionContext<DefaultInspectorAdapters>;

const mockFormatFactory = fieldFormatsServiceMock.createStartContract().deserialize;

describe('datatableFn', () => {
  function buildTable(): Datatable {
    return {
      type: 'datatable',
      columns: [
        { id: 'bucket1', name: 'bucket1', meta: { type: 'string' } },
        { id: 'bucket2', name: 'bucket2', meta: { type: 'string' } },
        { id: 'bucket3', name: 'bucket3', meta: { type: 'string' } },
        { id: 'metric1', name: 'metric1', meta: { type: 'number' } },
        { id: 'metric2', name: 'metric2', meta: { type: 'number' } },
      ],
      rows: [
        { bucket1: 'A', bucket2: 'D', bucket3: 'X', metric1: 1, metric2: 2 },
        { bucket1: 'A', bucket2: 'D', bucket3: 'Y', metric1: 3, metric2: 4 },
        { bucket1: 'A', bucket2: 'D', bucket3: 'Z', metric1: 5, metric2: 6 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'X', metric1: 7, metric2: 8 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'Y', metric1: 9, metric2: 10 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'Z', metric1: 11, metric2: 12 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'X', metric1: 13, metric2: 14 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'Y', metric1: 15, metric2: 16 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'Z', metric1: 17, metric2: 18 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'X', metric1: 19, metric2: 20 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'Y', metric1: 21, metric2: 22 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'Z', metric1: 23, metric2: 24 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'X', metric1: 25, metric2: 26 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'Y', metric1: 27, metric2: 28 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'Z', metric1: 29, metric2: 30 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'X', metric1: 31, metric2: 32 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'Y', metric1: 33, metric2: 34 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'Z', metric1: 35, metric2: 36 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'X', metric1: 37, metric2: 38 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'Y', metric1: 39, metric2: 40 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'Z', metric1: 41, metric2: 42 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'X', metric1: 43, metric2: 44 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'Y', metric1: 45, metric2: 46 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'Z', metric1: 47, metric2: 48 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'X', metric1: 49, metric2: 50 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'Y', metric1: 51, metric2: 52 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'Z', metric1: 53, metric2: 54 },
      ],
    };
  }

  function buildArgs(): DatatableArgs {
    return {
      title: 'Table',
      sortingColumnId: undefined,
      sortingDirection: 'none',
      columns: [
        {
          type: 'lens_datatable_column',
          columnId: 'bucket1',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'bucket2',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'bucket3',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'metric1',
          isTransposed: false,
          transposable: true,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'metric2',
          isTransposed: false,
          transposable: true,
        },
      ],
    };
  }

  it('should correctly sort columns in table by order of args.columns', async () => {
    const table = buildTable();
    const shuffledTable: Datatable = {
      ...table,
      columns: shuffle(table.columns),
    };
    const args = buildArgs();
    const result = await datatableFn(() => mockFormatFactory)(shuffledTable, args, context);

    const resultColumnIds = result.value.data.columns.map((c) => c.id);
    const expectedColumnIds = args.columns.map((c) => c.columnId);

    expect(resultColumnIds).toEqual(expectedColumnIds);
    expect(resultColumnIds).toEqual(['bucket1', 'bucket2', 'bucket3', 'metric1', 'metric2']);
  });

  // This is needed for ghost formula columns, see https://github.com/elastic/kibana/issues/239170
  it('should sort unknown columns in table by order of args.columns', async () => {
    const table = buildTable();
    const shuffledTable: Datatable = {
      ...table,
      columns: shuffle([
        ...table.columns,
        { id: 'unknown', name: 'unknown', meta: { type: 'number' } },
      ]),
    };
    const args = buildArgs();
    const result = await datatableFn(() => mockFormatFactory)(shuffledTable, args, context);

    const resultColumnIds = result.value.data.columns.map((c) => c.id);
    const expectedColumnIds = args.columns.map((c) => c.columnId).concat('unknown');

    expect(resultColumnIds).toEqual(expectedColumnIds);
    expect(resultColumnIds).toEqual([
      'bucket1',
      'bucket2',
      'bucket3',
      'metric1',
      'metric2',
      'unknown',
    ]);
  });

  describe('subtotals', () => {
    it('should add subtotal rows when rowSubtotals is enabled', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        rowSubtotals: {
          enabled: true,
          position: 'after',
          functions: ['sum'],
          levels: [1], // Subtotal by bucket1
        },
      };
      // Mark columns as metrics or not
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // Should have original 27 rows + 3 subtotal rows (one for each unique bucket1 value: A, B, C)
      expect(result.value.data.rows.length).toBe(30);

      // Find subtotal rows
      const subtotalRows = result.value.data.rows.filter((row: any) => row.__isSubtotal);
      expect(subtotalRows.length).toBe(3);

      // Check first subtotal (for bucket1 = 'A')
      const firstSubtotal = subtotalRows[0];
      expect(firstSubtotal.bucket1).toBe('A');
      // Sum of metric1 for bucket1='A': 1+3+5+7+9+11+13+15+17 = 81
      expect(firstSubtotal.metric1).toBe(81);
      // Sum of metric2 for bucket1='A': 2+4+6+8+10+12+14+16+18 = 90
      expect(firstSubtotal.metric2).toBe(90);
    });

    it('should add subtotal rows before groups when position is "before"', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        rowSubtotals: {
          enabled: true,
          position: 'before',
          functions: ['sum'],
          levels: [1],
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // First row should be a subtotal for bucket1='A'
      expect((result.value.data.rows[0] as any).__isSubtotal).toBe(true);
      expect(result.value.data.rows[0].bucket1).toBe('A');
    });

    it('should calculate average when function is "avg"', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        rowSubtotals: {
          enabled: true,
          position: 'after',
          functions: ['avg'],
          levels: [1],
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      const subtotalRows = result.value.data.rows.filter((row: any) => row.__isSubtotal);
      const firstSubtotal = subtotalRows[0];

      // Average of metric1 for bucket1='A': (1+3+5+7+9+11+13+15+17) / 9 = 9
      expect(firstSubtotal.metric1).toBe(9);
    });

    it('should support multiple subtotal levels', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        rowSubtotals: {
          enabled: true,
          position: 'after',
          functions: ['sum'],
          levels: [1, 2], // Subtotal by bucket1 and bucket1+bucket2
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      const subtotalRows = result.value.data.rows.filter((row: any) => row.__isSubtotal);
      // 3 level-1 subtotals (A, B, C) + 9 level-2 subtotals (A-D, A-E, A-F, B-D, B-E, B-F, C-D, C-E, C-F)
      expect(subtotalRows.length).toBe(12);
    });
  });

  describe('grand totals', () => {
    it('should add grand total row when grandTotals.rows is enabled', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        grandTotals: {
          rows: true,
          columns: false,
          position: 'bottom',
          functions: ['sum'],
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // Should have original 27 rows + 1 grand total row
      expect(result.value.data.rows.length).toBe(28);

      // Last row should be grand total
      const lastRow = result.value.data.rows[result.value.data.rows.length - 1];
      expect((lastRow as any).__isGrandTotal).toBe(true);

      // Sum of all metric1 values: sum from 1 to 53 (odd numbers) = 729
      expect(lastRow.metric1).toBe(729);
      // Sum of all metric2 values: sum from 2 to 54 (even numbers) = 756
      expect(lastRow.metric2).toBe(756);
    });

    it('should add grand total row at top when position is "top"', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        grandTotals: {
          rows: true,
          columns: false,
          position: 'top',
          functions: ['sum'],
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // First row should be grand total
      expect((result.value.data.rows[0] as any).__isGrandTotal).toBe(true);
    });

    it('should label grand total row with "Grand Total" in first column', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        grandTotals: {
          rows: true,
          columns: false,
          position: 'bottom',
          functions: ['sum'],
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // Last row should be grand total
      const lastRow = result.value.data.rows[result.value.data.rows.length - 1];
      expect((lastRow as any).__isGrandTotal).toBe(true);

      // First bucket column should be labeled "Grand Total"
      expect(lastRow.bucket1).toBe('Grand Total');
    });

    it('should work with both subtotals and grand totals enabled', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        rowSubtotals: {
          enabled: true,
          position: 'after',
          functions: ['sum'],
          levels: [1],
        },
        grandTotals: {
          rows: true,
          columns: false,
          position: 'bottom',
          functions: ['sum'],
        },
      };
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // Should have original 27 rows + 3 subtotal rows + 1 grand total row = 31
      expect(result.value.data.rows.length).toBe(31);

      const subtotalRows = result.value.data.rows.filter((row: any) => row.__isSubtotal);
      expect(subtotalRows.length).toBe(3);

      const grandTotalRows = result.value.data.rows.filter((row: any) => row.__isGrandTotal);
      expect(grandTotalRows.length).toBe(1);
    });

    it('should add grand total columns when grandTotals.columns is enabled with transpose', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        grandTotals: {
          rows: false,
          columns: true,
          position: 'bottom',
          functions: ['sum'],
        },
      };

      // Transpose bucket3 to create columns
      args.columns[2].isTransposed = true;

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // After transpose, we should have:
      // - bucket1, bucket2 (non-transposed buckets)
      // - X---metric1, X---metric2, Y---metric1, Y---metric2, Z---metric1, Z---metric2 (transposed)
      // - metric1___grand_total, metric2___grand_total (grand total columns)
      const columnIds = result.value.data.columns.map((c: any) => c.id);

      expect(columnIds).toContain('metric1___grand_total');
      expect(columnIds).toContain('metric2___grand_total');

      // Verify grand total column names
      const metric1GrandTotalCol = result.value.data.columns.find(
        (c: any) => c.id === 'metric1___grand_total'
      );
      expect(metric1GrandTotalCol?.name).toContain('Grand Total');

      // Check that grand total values are calculated correctly
      // For the first row (A, D), bucket3 values are X, Y, Z with metric1 = 1, 3, 5
      // Sum should be 1 + 3 + 5 = 9
      const firstRow = result.value.data.rows[0];
      expect(firstRow.metric1___grand_total).toBe(9);

      // For metric2, values are 2, 4, 6, sum = 12
      expect(firstRow.metric2___grand_total).toBe(12);
    });

    it('should calculate grand total columns with avg function', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        grandTotals: {
          rows: false,
          columns: true,
          position: 'bottom',
          functions: ['avg'],
        },
      };

      // Transpose bucket3 to create columns
      args.columns[2].isTransposed = true;

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // For the first row (A, D), bucket3 values are X, Y, Z with metric1 = 1, 3, 5
      // Average should be (1 + 3 + 5) / 3 = 3
      const firstRow = result.value.data.rows[0];
      expect(firstRow.metric1___grand_total).toBe(3);

      // For metric2, values are 2, 4, 6, avg = 4
      expect(firstRow.metric2___grand_total).toBe(4);
    });

    it('should work with both row and column grand totals', async () => {
      const table = buildTable();
      const args: DatatableArgs = {
        ...buildArgs(),
        grandTotals: {
          rows: true,
          columns: true,
          position: 'bottom',
          functions: ['sum'],
        },
      };

      // Transpose bucket3 to create columns
      args.columns[2].isTransposed = true;
      args.columns = args.columns.map((col) => ({
        ...col,
        isMetric: col.columnId.startsWith('metric'),
      }));

      const result = await datatableFn(() => mockFormatFactory)(table, args, context);

      // Should have grand total columns
      const columnIds = result.value.data.columns.map((c: any) => c.id);
      expect(columnIds).toContain('metric1___grand_total');
      expect(columnIds).toContain('metric2___grand_total');

      // Should have grand total row
      const lastRow = result.value.data.rows[result.value.data.rows.length - 1];
      expect((lastRow as any).__isGrandTotal).toBe(true);

      // The grand total row should also have values for the grand total columns
      // The grand total column in the grand total row should be the sum of all grand totals
      expect(lastRow.metric1___grand_total).toBeDefined();
      expect(lastRow.metric2___grand_total).toBeDefined();
    });
  });
});
