/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cardContentWidth } from '@kbn/isomer-theme';
import { BORDER, SIZE, TEXT, textHeight, textWidth, wrappedLines } from '../../lib';
import type { TableView } from './table_model';

type DrawnTable = Pick<TableView, 'columns' | 'rows' | 'note'>;

const CELL_PADDING = 2 * SIZE.s;

// As automatic table layout does: a column narrower than an equal share keeps its natural width, and the wider columns split what is left in proportion to theirs.
const columnWidths = ({ columns, rows }: DrawnTable): number[] => {
  const natural = columns.map(
    ({ label }, index) =>
      Math.max(
        textWidth(label, TEXT.s.fontSize),
        ...rows.map((cells) => textWidth(cells[index] ?? '', TEXT.s.fontSize))
      ) + CELL_PADDING
  );
  const tableWidth = cardContentWidth();
  const share = tableWidth / columns.length;
  const narrow = natural.filter((width) => width <= share);
  const wide = natural.filter((width) => width > share);
  const left = tableWidth - narrow.reduce((sum, width) => sum + width, 0);
  const wideTotal = wide.reduce((sum, width) => sum + width, 0);
  return natural.map((width) =>
    width <= share || wideTotal <= left ? width : (left * width) / wideTotal
  );
};

/** The card height of a table as `tableReactRenderer` draws it: one heading row, which doesn't wrap, then each row as tall as its tallest cell. */
export const tableSnapshotHeight = (view: DrawnTable): number => {
  const widths = columnWidths(view);
  const tableWidth = cardContentWidth();
  const rowHeight = (lines: number) => lines * TEXT.s.lineHeight + 2 * SIZE.xs + BORDER.thin;
  const cellLines = (cell: string, index: number) =>
    wrappedLines(cell, TEXT.s.fontSize, tableWidth - widths[index] + CELL_PADDING);
  return (
    SIZE.m +
    rowHeight(1) +
    view.rows.reduce(
      (height, cells) => height + rowHeight(Math.max(1, ...cells.map(cellLines))),
      0
    ) +
    (view.note ? SIZE.xs + textHeight(view.note, TEXT.xs) : 0)
  );
};
