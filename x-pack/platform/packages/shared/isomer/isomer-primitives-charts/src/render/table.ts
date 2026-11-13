/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A chart read as data, in its reading order: what every surface prints. */
export interface ChartTable {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}

const WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦\u{20000}-\u{3FFFD}]|\p{Emoji_Presentation}/u;

const ZERO = /[\p{M}\p{Cc}\p{Cf}]/u;

/** Monospace columns `text` fills: East Asian wide glyphs and emoji take two, marks and controls none. */
const displayColumns = (text: string): number => {
  let columns = 0;
  for (const glyph of text) {
    columns += ZERO.test(glyph) ? 0 : WIDE.test(glyph) ? 2 : 1;
  }
  return columns;
};

const LINE_TERMINATOR = /[\r\n\u2028\u2029]/;

/** `text` on one line: each run of whitespace holding a line terminator becomes one space. */
export const oneLine = (text: string): string =>
  text.replace(/\s+/g, (run) => (LINE_TERMINATOR.test(run) ? ' ' : run));

/** Space-padded columns under a dashed rule. */
export const textTable = ({ columns, rows }: ChartTable): string => {
  const head = columns.map(oneLine);
  const body = rows.map((row) => row.map(oneLine));
  const widths = head.map((column, index) =>
    Math.max(displayColumns(column), ...body.map((row) => displayColumns(row[index] ?? '')))
  );
  const line = (cells: readonly string[]) =>
    cells
      .map(
        (cell, index) =>
          `${cell}${' '.repeat(Math.max(0, (widths[index] ?? 0) - displayColumns(cell)))}`
      )
      .join('  ')
      .trimEnd();
  return [line(head), line(widths.map((width) => '-'.repeat(width))), ...body.map(line)].join('\n');
};
