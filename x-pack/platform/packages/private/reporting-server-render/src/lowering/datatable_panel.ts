/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A loose subset of `Datatable` (`@kbn/expressions-plugin/common`): just the columns/rows this lowering needs, so callers don't have to supply a full `DatatableColumnMeta` per column. */
export interface LowerableDatatable {
  columns: Array<{ id: string; name: string }>;
  rows: Array<Record<string, unknown>>;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

export type CellFormatter = (value: unknown, columnId: string) => string;

/** Default formatter: `fieldFormats` is a Spike B headless service, not wired up here yet. */
const defaultFormatter: CellFormatter = (value) =>
  value === null || value === undefined ? '' : escapeHtml(String(value));

/**
 * Spike E, Tier 3 finding: `EuiDataGrid` (what `lnsDatatable`/legacy `table` actually
 * render through) is virtualized -- it measures its own container and only renders the
 * rows that fit the measured viewport, which jsdom (no real layout engine) cannot do. The
 * render *value* underneath (a plain {@link Datatable}: columns + rows) has everything
 * needed to lower to a plain `<table>` instead of mounting the grid component, matching the
 * plan's Tier 3 lowering strategy.
 *
 * What's intentionally not reproduced here: column resizing/reordering, sticky header
 * variants, pagination (a lowered table in a fixed-size PDF panel renders every row, like
 * Chromium-captured Reporting already does for `preserve_layout`), and per-field-type
 * formatting -- `cellFormatter` is the integration point for Spike B's `fieldFormats`
 * headless service (not wired up in this prototype pass); it defaults to `String(value)`.
 */
export const renderDatatablePanel = (
  table: LowerableDatatable,
  { cellFormatter = defaultFormatter }: { cellFormatter?: CellFormatter } = {}
): string => {
  const headerHtml = table.columns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join('');

  const rowsHtml = table.rows
    .map((row) => {
      const cellsHtml = table.columns
        .map((column) => `<td>${cellFormatter(row[column.id], column.id)}</td>`)
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  return `<table class="reportingDatatable"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
};
