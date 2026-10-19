/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Renderers } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import type { ComponentsPackTypes } from '../../lib';
import type { TableNode } from './table';
import { tableView } from './table_model';

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
    note: css`
      margin: ${size.xs} 0 0;
      color: ${color.text.subdued};
      font-size: ${font.size.xs};
      line-height: ${font.lineHeight.xs};
    `,
  })
);

export const tableReactRenderer: Renderers<TableNode, ComponentsPackTypes>['react'] = (
  node,
  { context }
) => {
  const { columns, rows, note } = tableView(node);
  return (
    <div {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
      <table className={classNames(context, handles.table)}>
        <thead>
          <tr>
            {columns.map(({ label, align }, index) => (
              <th
                key={index}
                scope="col"
                className={classNames(context, handles.head, handles[align])}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((text, index) => (
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
};
