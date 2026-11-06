/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What Lens says was clicked: the table it drew, and where in it. */
interface ClickedDatum {
  table: {
    columns: ReadonlyArray<{ id: string; name: string }>;
    rows: ReadonlyArray<Record<string, unknown>>;
  };
  column?: number;
  row?: number;
  /** The value that was clicked, which the row has too. */
  value?: unknown;
  cells?: ReadonlyArray<{ column: number; row: number }>;
}

/**
 * The row of the query that was clicked, by the names of its columns, as a row of a table is when
 * it is clicked, so that the same actions can remember its columns. A click on a bar of a chart
 * that is split by a series gives both the value of the bar and of the series. Nothing is made of
 * a click that does not point at a row of the table.
 */
export const getClickedRow = (
  event: { data?: ReadonlyArray<ClickedDatum> } | undefined
): Record<string, unknown> | undefined => {
  const datum = event?.data?.[0];
  if (!datum) return undefined;

  const index = datum.row ?? datum.cells?.[0]?.row;
  if (index === undefined) return undefined;

  const row = datum.table?.rows?.[index];
  if (!row || typeof row !== 'object') return undefined;

  return Object.fromEntries(
    datum.table.columns.flatMap(({ id, name }) => (id in row ? [[name ?? id, row[id]]] : []))
  );
};
