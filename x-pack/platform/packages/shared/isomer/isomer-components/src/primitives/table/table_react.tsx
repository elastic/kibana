/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Renderers, StyledRenderContext } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import type { ComponentsPackTypes } from '../../lib';
import type { TableNode } from './table';
import type { SortDirection, TableView } from './table_model';
import { noRowsNote, tableView } from './table_model';
import { TABLE_SORT_ATTRIBUTES, TABLE_SORT_ENHANCEMENT } from './table_sort';

const { handles } = isomerDistillery.createStyleModule(
  'componentsTable',
  ({ css, tokens: { border, color, font, size } }) => ({
    root: css`
      margin: ${size.m} 0;
      overflow-x: auto;
    `,
    table: css`
      border-collapse: collapse;
      min-width: 100%;
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
    head: css`
      padding: ${size.xs} ${size.s};
      border-bottom: ${border.width.thin} solid ${color.border.plain};
      color: ${color.text.heading};
      font-weight: ${font.weight.semiBold};
      white-space: nowrap;

      /* The button the tableSort script wraps a sortable heading in: TABLE_SORT_ATTRIBUTES.button. */
      & > button[data-isomer-sort-button] {
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: inherit;
        cursor: pointer;
      }
    `,
    cell: css`
      padding: ${size.xs} ${size.s};
      border-bottom: ${border.width.thin} solid ${color.border.subdued};
      color: ${color.text.paragraph};
      vertical-align: top;
    `,
    left: css`
      text-align: left;
    `,
    center: css`
      text-align: center;
    `,
    right: css`
      text-align: right;
      font-variant-numeric: tabular-nums;
    `,
    sortMark: css`
      margin-left: ${size.xs};
      color: ${color.text.subdued};

      &:empty {
        display: none;
      }
    `,
    note: css`
      margin: ${size.xs} 0 0;
      color: ${color.text.subdued};
      font-size: ${font.size.xs};
      line-height: ${font.lineHeight.xs};
    `,
  })
);

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;
const SORT_MARK = { asc: '↑', desc: '↓' } as const;

interface SortState {
  column: number;
  direction: SortDirection;
}

/** The node's own sort, which `tableView` has already applied to the rows. */
const nodeSort = ({ sort }: TableNode): SortState | undefined =>
  sort ? { column: sort.column, direction: sort.direction ?? 'asc' } : undefined;

const data = (name: string, value: string | number = '') => ({ [name]: String(value) });

interface TableProps {
  node: TableNode;
  context: StyledRenderContext;
  view: TableView;
  /** Marks the table for the `tableSort` script, which sorts it in the browser. */
  sortable: boolean;
}

const Table = ({
  node,
  context,
  view: { columns, rows, cells, note, styles },
  sortable,
}: TableProps) => {
  const sorted = nodeSort(node);
  return (
    <div {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
      <table
        className={classNames(context, handles.table)}
        // Sized columns keep their widths; the table may then be wider than its box, which cuts it off.
        {...(columns.some(({ width }) => width)
          ? { style: { width: 'max-content', minWidth: '100%' } }
          : {})}
        {...(sortable ? data(TABLE_SORT_ATTRIBUTES.table) : {})}
      >
        <thead>
          <tr>
            {columns.map(({ label, align, width }, index) => {
              const direction = sorted?.column === index ? sorted.direction : undefined;
              return (
                <th
                  key={index}
                  scope="col"
                  className={classNames(context, handles.head, handles[align])}
                  {...(width ? { style: { width, minWidth: width, maxWidth: width } } : {})}
                  {...(direction ? { 'aria-sort': ARIA_SORT[direction] } : {})}
                  {...(sortable ? data(TABLE_SORT_ATTRIBUTES.column, index) : {})}
                >
                  {label}
                  {direction || sortable ? (
                    <span
                      aria-hidden="true"
                      className={classNames(context, handles.sortMark)}
                      {...(sortable ? data(TABLE_SORT_ATTRIBUTES.mark) : {})}
                    >
                      {direction ? SORT_MARK[direction] : ''}
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} {...(sortable ? data(TABLE_SORT_ATTRIBUTES.row, rowIndex) : {})}>
              {row.map((text, index) => {
                const cell = cells[rowIndex][index];
                const style = styles?.[rowIndex]?.[index];
                return (
                  <td
                    key={index}
                    className={classNames(context, handles.cell, handles[columns[index].align])}
                    {...(style
                      ? { style: { backgroundColor: style.background, color: style.color } }
                      : {})}
                    {...(sortable && cell !== null
                      ? data(TABLE_SORT_ATTRIBUTES.value, JSON.stringify(cell))
                      : {})}
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {note || rows.length === 0 ? (
        <p className={classNames(context, handles.note)}>{note ?? noRowsNote()}</p>
      ) : null}
    </div>
  );
};

export const tableReactRenderer: Renderers<TableNode, ComponentsPackTypes>['react'] = (
  node,
  { context }
) => {
  const view = tableView(node);
  // Sorting only the shown rows of a cut table would mislead, so a cut table keeps its order.
  const sortable =
    context.enhancements?.has(TABLE_SORT_ENHANCEMENT) === true &&
    !view.note &&
    view.rows.length > 1;
  return <Table node={node} context={context} view={view} sortable={sortable} />;
};
