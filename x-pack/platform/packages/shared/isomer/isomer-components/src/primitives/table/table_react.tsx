/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Renderers, StyledRenderContext } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import type { ComponentsPackTypes } from '../../lib';
import type { TableNode } from './table';
import type { SortDirection, TableView } from './table_model';
import { sortOrder, tableView } from './table_model';
import { TABLE_SORT_ENHANCEMENT } from './table_sort';

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
    `,
    sortButton: css`
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: inherit;
      cursor: pointer;
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
const SORT_MARK = { asc: '↑', desc: '↓', none: '↕' } as const;

interface SortState {
  column: number;
  direction: SortDirection;
}

interface TableProps {
  node: TableNode;
  context: StyledRenderContext;
  view: TableView;
  /** The order to show `view.rows` in, as indexes. */
  order: readonly number[];
  /** Set when headings sort the rows. */
  sort?: { state?: SortState; onSort: (column: number) => void };
}

const Table = ({ node, context, view: { columns, rows, note }, order, sort }: TableProps) => (
  <div {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
    <table className={classNames(context, handles.table)}>
      <thead>
        <tr>
          {columns.map(({ label, align }, index) => (
            <th
              key={index}
              scope="col"
              className={classNames(context, handles.head, handles[align])}
              {...(sort?.state?.column === index
                ? { 'aria-sort': ARIA_SORT[sort.state.direction] }
                : {})}
            >
              {sort ? (
                <button
                  type="button"
                  className={classNames(context, handles.sortButton)}
                  onClick={() => sort.onSort(index)}
                >
                  {label}
                  <span aria-hidden="true" className={classNames(context, handles.sortMark)}>
                    {sort.state?.column === index
                      ? SORT_MARK[sort.state.direction]
                      : SORT_MARK.none}
                  </span>
                </button>
              ) : (
                label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {order.map((rowIndex) => (
          <tr key={rowIndex}>
            {rows[rowIndex].map((text, index) => (
              <td
                key={index}
                className={classNames(context, handles.cell, handles[columns[index].align])}
              >
                {text}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {note || rows.length === 0 ? (
      <p className={classNames(context, handles.note)}>{note ?? 'No rows'}</p>
    ) : null}
  </div>
);

/** A table whose headings sort its rows: the first click ascending, the next reversing. */
const SortableTable = (props: Omit<TableProps, 'order' | 'sort'>) => {
  const { node, view } = props;
  const [state, setState] = useState<SortState | undefined>(
    node.sort ? { column: node.sort.column, direction: node.sort.direction ?? 'asc' } : undefined
  );
  // The rows arrive in the node's sort; re-sorting by that same sort leaves them in place.
  const order = state
    ? sortOrder(view.cells, state.column, state.direction)
    : view.rows.map((_row, index) => index);
  const onSort = (column: number) =>
    setState((current) => ({
      column,
      direction: current?.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  return <Table {...props} order={order} sort={{ state, onSort }} />;
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
  return sortable ? (
    <SortableTable node={node} context={context} view={view} />
  ) : (
    <Table
      node={node}
      context={context}
      view={view}
      order={view.rows.map((_row, index) => index)}
    />
  );
};
