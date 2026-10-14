/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { nodeAnchor, type StyledRenderContext } from '@elastic/isomer-sdk';

import type { ChartNode } from '../charts/define';
import { chartRoot } from '../theme/distillery';

import { type ChartReactEnv, cls } from './context';
import { figureModule, tableModule } from './styles';
import type { ChartHeading, ChartReading } from './surfaces';
import type { ChartTable } from './table';

const figure = figureModule.handles;
const table = tableModule.handles;

const DataTable = ({
  context,
  data: { columns, rows },
}: {
  context: StyledRenderContext | undefined;
  data: ChartTable;
}): ReactNode => (
  <table className={cls(context, table.table)}>
    <thead>
      <tr>
        {columns.map((column, index) => (
          <th key={index} scope="col" className={cls(context, table.cell, table.head)}>
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((value, index) => (
            <td key={index} className={cls(context, table.cell)}>
              {value}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/** The one `react` renderer every chart shares: its title, description, summary, and data table. */
export const chartReact =
  <TNode extends ChartNode & ChartHeading>(read: (node: TNode) => ChartReading) =>
  (node: TNode, { context }: ChartReactEnv): ReactNode => {
    const { title, description } = node;
    const { summary, table: data } = read(node);
    return (
      <figure
        className={`${chartRoot} ${cls(context, figure.root)}`}
        data-chart={node.type}
        {...(title === undefined ? { 'aria-label': summary } : {})}
        {...nodeAnchor(context, node)}
      >
        {title !== undefined && (
          <figcaption className={cls(context, figure.caption)}>{title}</figcaption>
        )}
        {description !== undefined && (
          <p className={cls(context, figure.description)}>{description}</p>
        )}
        <p className={cls(context, figure.summary)}>{summary}</p>
        <DataTable {...{ context, data }} />
      </figure>
    );
  };
