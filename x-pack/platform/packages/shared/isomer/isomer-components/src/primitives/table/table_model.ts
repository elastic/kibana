/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredValueFormat } from '@elastic/isomer-sdk';
import { formatDisplayValue } from '@elastic/isomer-sdk';
import { i18n } from '@kbn/i18n';

import { oneLine } from '../../lib';
import type { TableNode } from './table';

export type TableAlign = 'left' | 'center' | 'right';

/** A table as every surface draws it: labels, formatted rows in order, and the note when rows were cut. */
export interface TableView {
  columns: ReadonlyArray<{ label: string; align: TableAlign }>;
  rows: ReadonlyArray<readonly string[]>;
  /** Each shown row's unformatted cells, in the same order as `rows`, for sorting in the browser. */
  cells: ReadonlyArray<readonly Cell[]>;
  /** Each shown row's index in the node's `rows`, in the same order as `rows`, to break sort ties. */
  sourceIndexes: readonly number[];
  /** "Showing N of M rows", when fewer rows are shown than the source had. */
  note?: string;
}

export type Cell = TableNode['rows'][number][number];

const NUMERIC_FORMATS: ReadonlySet<StructuredValueFormat> = new Set([
  'number',
  'compact',
  'percent',
  'currency',
  'bytes',
  'duration',
]);

const collator = new Intl.Collator('en-US', { numeric: true });

// `null` sorts last in either direction; numbers before strings, so a mixed column stays grouped.
const compareCells = (a: Cell, b: Cell): number => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'number') {
    return -1;
  }
  if (typeof b === 'number') {
    return 1;
  }
  return collator.compare(a ?? '', b ?? '');
};

export type SortDirection = 'asc' | 'desc';

/**
 * The order of `rows` sorted by `column`, as indexes: stable, with empty cells last in either
 * direction. The server and the `tableSort` enhancement both sort through it, so they agree.
 */
export const sortOrder = (
  rows: ReadonlyArray<readonly Cell[]>,
  column: number,
  direction: SortDirection = 'asc'
): number[] => {
  const sign = direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ value: row[column] ?? null, index }))
    .sort((left, right) => {
      const { value: a } = left;
      const { value: b } = right;
      if (a === null || b === null) {
        return a === b ? left.index - right.index : a === null ? 1 : -1;
      }
      return sign * compareCells(a, b) || left.index - right.index;
    })
    .map(({ index }) => index);
};

const sortedIndexes = ({ rows, sort }: TableNode): number[] =>
  sort ? sortOrder(rows, sort.column, sort.direction) : rows.map((_row, index) => index);

const defaultAlign = (
  { format }: TableNode['columns'][number],
  cells: readonly Cell[]
): TableAlign => {
  if (format) {
    return NUMERIC_FORMATS.has(format) ? 'right' : 'left';
  }
  const values = cells.filter((cell) => cell !== null);
  return values.length > 0 && values.every((cell) => typeof cell === 'number') ? 'right' : 'left';
};

const formatCell = (cell: Cell, { format, precision, currency }: TableNode['columns'][number]) => {
  if (cell === null || cell === '') {
    return '';
  }
  return oneLine(formatDisplayValue({ raw: cell, format, precision, currency }));
};

const count = (value: number): string => value.toLocaleString('en-US');

/** "Showing N of M rows". */
export const rowsNote = (shown: number, total: number): string =>
  i18n.translate('xpack.isomer.components.table.rowsNote', {
    defaultMessage: 'Showing {shown} of {totalText} {total, plural, one {row} other {rows}}',
    values: { shown: count(shown), totalText: count(total), total },
  });

/** The note on a table with no rows. */
export const noRowsNote = (): string =>
  i18n.translate('xpack.isomer.components.table.noRowsNote', { defaultMessage: 'No rows' });

/** `node` sorted, capped at `maxRows` and at `limit`, and formatted. */
export const tableView = (node: TableNode, limit = Infinity): TableView => {
  const { columns, maxRows, totalRows } = node;
  const sourceIndexes = sortedIndexes(node).slice(0, Math.min(maxRows ?? Infinity, limit));
  const shown = sourceIndexes.map((index) => node.rows[index]);
  const total = Math.max(totalRows ?? 0, node.rows.length);
  return {
    columns: columns.map((column, index) => ({
      label: oneLine(column.label),
      align:
        column.align ??
        defaultAlign(
          column,
          node.rows.map((row) => row[index] ?? null)
        ),
    })),
    rows: shown.map((row) =>
      columns.map((column, index) => formatCell(row[index] ?? null, column))
    ),
    cells: shown.map((row) => columns.map((_column, index) => row[index] ?? null)),
    sourceIndexes,
    ...(shown.length < total ? { note: rowsNote(shown.length, total) } : {}),
  };
};

/** Display width of `value`, by code point. */
const width = (value: string): number => [...value].length;

/** Space-padded columns under a dashed rule, after `elastic/isomer`'s `textTable`. */
export const textTable = ({ columns, rows }: TableView): string => {
  const head = columns.map(({ label }) => label);
  const widths = head.map((label, index) =>
    Math.max(width(label), ...rows.map((row) => width(row[index] ?? '')))
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, index) => {
        const pad = ' '.repeat(Math.max(0, (widths[index] ?? 0) - width(cell)));
        return columns[index]?.align === 'right' ? `${pad}${cell}` : `${cell}${pad}`;
      })
      .join('  ')
      .trimEnd();
  return [line(head), line(widths.map((size) => '-'.repeat(size))), ...rows.map(line)].join('\n');
};
