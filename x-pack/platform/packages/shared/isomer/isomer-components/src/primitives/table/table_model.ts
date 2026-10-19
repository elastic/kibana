/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredValueFormat } from '@elastic/isomer-sdk';
import { formatDisplayValue } from '@elastic/isomer-sdk';

import { oneLine } from '../../lib';
import type { TableNode } from './table';

export type TableAlign = 'left' | 'center' | 'right';

/** A table as every surface draws it: labels, formatted rows in order, and the note when rows were cut. */
export interface TableView {
  columns: ReadonlyArray<{ label: string; align: TableAlign }>;
  rows: ReadonlyArray<readonly string[]>;
  /** "Showing N of M rows", when fewer rows are shown than the source had. */
  note?: string;
}

type Cell = TableNode['rows'][number][number];

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

const sortedRows = ({ rows, sort }: TableNode): ReadonlyArray<readonly Cell[]> => {
  if (!sort) {
    return rows;
  }
  const { column, direction = 'asc' } = sort;
  const sign = direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = left.row[column] ?? null;
      const b = right.row[column] ?? null;
      if (a === null || b === null) {
        return a === b ? left.index - right.index : a === null ? 1 : -1;
      }
      return sign * compareCells(a, b) || left.index - right.index;
    })
    .map(({ row }) => row);
};

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
  `Showing ${count(shown)} of ${count(total)} ${total === 1 ? 'row' : 'rows'}`;

/** `node` sorted, capped at `maxRows` and at `limit`, and formatted. */
export const tableView = (node: TableNode, limit = Infinity): TableView => {
  const { columns, maxRows, totalRows } = node;
  const sorted = sortedRows(node);
  const shown = sorted.slice(0, Math.min(maxRows ?? Infinity, limit));
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
