/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancementDefinition } from '@elastic/isomer-sdk';
import { someBodyNode } from '@elastic/isomer-sdk';

import type { TableNode } from './table';

/** The id a host passes in `enhancements` to let readers sort tables by a column. */
export const TABLE_SORT_ENHANCEMENT = 'tableSort';

/** The `data-*` hooks the table renders for the script, which can't rely on minified class names. */
export const TABLE_SORT_ATTRIBUTES = {
  /** On a `<table>` the script sorts. */
  table: 'data-isomer-table-sort',
  /** On each `<th>`, its column's index. */
  column: 'data-isomer-sort-column',
  /** On each heading's arrow, empty until the column is sorted. */
  mark: 'data-isomer-sort-mark',
  /** On each body `<tr>`, its index in the node's order, which breaks ties. */
  row: 'data-isomer-sort-row',
  /** On each `<td>` with a value, its raw value as JSON; an empty cell has none. */
  value: 'data-isomer-sort-value',
  /** On the `<button>` the script wraps each heading in. */
  button: 'data-isomer-sort-button',
  /** Set by the script on a table it has enhanced, so running it again leaves the table be. */
  enhanced: 'data-isomer-table-sorting',
} as const;

const isSortableTable = (node: unknown): boolean => {
  const { type, rows } = node as Partial<TableNode>;
  return type === 'table' && Array.isArray(rows) && rows.length > 1;
};

const { table, column, mark, row, value, button, enhanced } = TABLE_SORT_ATTRIBUTES;

// Sorts as `sortOrder` in `table_model.ts` does: numbers by value and before text, text naturally,
// empty cells last in either direction, and ties in the node's order.
const script = `
const collator = new Intl.Collator('en-US', { numeric: true });
const MARKS = { ascending: '\\u2191', descending: '\\u2193' };
const compare = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  return collator.compare(String(a), String(b));
};
const valueAt = (tr, index) => {
  const raw = tr.cells[index] && tr.cells[index].getAttribute('${value}');
  return raw === null || raw === undefined ? null : JSON.parse(raw);
};
root.querySelectorAll('table[${table}]').forEach((table) => {
  if (table.hasAttribute('${enhanced}') || !table.tBodies[0]) return;
  table.setAttribute('${enhanced}', '');
  const body = table.tBodies[0];
  const headings = Array.from(table.querySelectorAll('th[${column}]'));
  const showMark = (th, direction) => {
    const span = th.querySelector('[${mark}]');
    if (span) span.textContent = direction ? MARKS[direction] : '\\u2195';
  };
  const sortBy = (index, direction) => {
    const sign = direction === 'descending' ? -1 : 1;
    Array.from(body.rows)
      .map((tr) => ({ tr, value: valueAt(tr, index), order: Number(tr.getAttribute('${row}')) }))
      .sort((left, right) => {
        if (left.value === null || right.value === null) {
          return left.value === right.value ? left.order - right.order : left.value === null ? 1 : -1;
        }
        return sign * compare(left.value, right.value) || left.order - right.order;
      })
      .forEach(({ tr }) => body.appendChild(tr));
    headings.forEach((th, at) => {
      if (at === index) th.setAttribute('aria-sort', direction);
      else th.removeAttribute('aria-sort');
      showMark(th, at === index ? direction : null);
    });
  };
  headings.forEach((th) => {
    const index = Number(th.getAttribute('${column}'));
    const control = th.ownerDocument.createElement('button');
    control.type = 'button';
    control.setAttribute('${button}', '');
    control.append(...Array.from(th.childNodes));
    th.appendChild(control);
    showMark(th, th.getAttribute('aria-sort'));
    control.addEventListener('click', () => {
      sortBy(index, th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending');
    });
  });
});
`;

/**
 * Lets the reader sort a table by clicking a column heading; a second click reverses it. The
 * table renders `data-*` hooks, and the script wraps each heading in a button and reorders the
 * rows, so it works on plain HTML and in React alike, and without it the table reads as it was
 * sorted.
 *
 * The SDK compiles the script with `new Function`, which a page whose Content-Security-Policy
 * refuses `'unsafe-eval'`, such as Kibana's, can't run.
 */
export const tableSortEnhancement: EnhancementDefinition = {
  id: TABLE_SORT_ENHANCEMENT,
  name: 'Sortable tables',
  description: 'Click a table column heading to sort its rows; click again to reverse.',
  appliesTo: (body, walk) => someBodyNode(body, 'react', isSortableTable, walk),
  script,
};
