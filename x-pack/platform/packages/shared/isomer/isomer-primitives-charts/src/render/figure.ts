/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ComponentType, createElement as h, type ReactNode } from 'react';
import { nodeAnchor, type StyledRenderContext } from '@elastic/isomer-sdk';

import { readArtifact } from '../engine/artifacts';
import type { ChartArtifact, ChartEngine, ChartNode, LiveChartProps } from '../engine/types';
import { type ChartSelection, selectionEvent, type SelectionTarget } from '../model/selection';
import { chartRoot } from '../theme/distillery';
import { type ColorMode, resolveChartTheme } from '../theme/resolve';

import { type ChartReactEnv, cls } from './context';
import { figureModule, legendModule, tableModule } from './styles';
import type { ChartHeading, ChartReading } from './surfaces';
import type { ChartTable } from './table';

const figure = figureModule.handles;
const legend = legendModule.handles;
const table = tableModule.handles;

/** How a pack instance draws: its engine, in which mode, and the mode a surface that names none gets. */
export interface ChartSeam {
  engine?: ChartEngine;
  render: 'live' | 'static';
  colorMode: ColorMode;
}

const DataTable = ({
  context,
  data: { columns, rows },
  hidden,
}: {
  context: StyledRenderContext | undefined;
  data: ChartTable;
  hidden: boolean;
}): ReactNode =>
  h(
    'table',
    {
      className: cls(context, table.table, ...(hidden ? [figure.visuallyHidden] : [])),
    },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        columns.map((column, index) =>
          h(
            'th',
            {
              key: index,
              scope: 'col',
              className: cls(context, table.cell, table.head),
            },
            column
          )
        )
      )
    ),
    h(
      'tbody',
      null,
      rows.map((row, rowIndex) =>
        h(
          'tr',
          { key: rowIndex },
          row.map((value, index) =>
            h('td', { key: index, className: cls(context, table.cell) }, value)
          )
        )
      )
    )
  );

const plotOf = (
  context: StyledRenderContext | undefined,
  { plot, width, height }: ChartArtifact
): ReactNode => {
  const className = cls(context, figure.plot);
  switch (plot.kind) {
    case 'image':
      return h('img', { className, src: plot.src, width, height, alt: '' });
    case 'svg':
      return h('div', {
        className,
        style: { width, height },
        dangerouslySetInnerHTML: { __html: plot.markup },
      });
    default:
      return h(
        'div',
        { className, style: { width, height } },
        h('style', null, plot.stylesheet),
        h('div', { dangerouslySetInnerHTML: { __html: plot.html } })
      );
  }
};

const Plot = ({
  context,
  artifact,
}: {
  context: StyledRenderContext | undefined;
  artifact: ChartArtifact;
}): ReactNode =>
  h(
    'div',
    { className: cls(context, figure.drawing), 'aria-hidden': 'true' },
    plotOf(context, artifact),
    artifact.legend.length > 0 &&
      h(
        'ul',
        { className: cls(context, legend.list) },
        artifact.legend.map(({ label, color }, index) =>
          h(
            'li',
            { key: index, className: cls(context, legend.item) },
            h('span', {
              className: cls(context, legend.swatch),
              style: { background: color },
            }),
            h('span', null, label)
          )
        )
      )
  );

/** The one `react` renderer every chart shares: live, from a prepared drawing, or its data table. */
export const chartReact =
  <TNode extends ChartNode & ChartHeading>(read: (node: TNode) => ChartReading, seam: ChartSeam) =>
  (node: TNode, { context, theme }: ChartReactEnv): ReactNode => {
    const { title, description } = node;
    const { summary, table: data } = read(node);
    const colorMode = theme?.colorMode ?? seam.colorMode;
    const Live =
      seam.render === 'live'
        ? (seam.engine?.live?.[node.type] as ComponentType<LiveChartProps> | undefined)
        : undefined;
    const artifact =
      Live === undefined && seam.engine ? readArtifact(seam.engine, node, colorMode) : undefined;
    const drawn = Live !== undefined || artifact !== undefined;
    const { selection } = node as { selection?: ChartSelection };
    const onSelect =
      selection && context?.onEvent
        ? (targets: readonly SelectionTarget[]) => {
            const [target] = targets;
            if (target) {
              context.onEvent?.(selectionEvent(selection, target));
            }
          }
        : undefined;
    return h(
      'figure',
      {
        className: `${chartRoot} ${cls(context, figure.root)}`,
        'data-chart': node.type,
        ...(title === undefined ? { 'aria-label': summary } : {}),
        'data-chart-state': Live ? 'live' : artifact ? 'artifact' : 'fallback',
        ...nodeAnchor(context, node),
      },
      title !== undefined &&
        h(
          'figcaption',
          {
            className: cls(
              context,
              drawn && seam.engine?.supports[node.type]?.drawsTitle
                ? figure.visuallyHidden
                : figure.caption
            ),
          },
          title
        ),
      description !== undefined &&
        h('p', { className: cls(context, figure.description) }, description),
      h(
        'p',
        {
          className: cls(context, drawn ? figure.visuallyHidden : figure.summary),
        },
        summary
      ),
      Live &&
        h(
          'div',
          { className: cls(context, figure.drawing) },
          h(Live, {
            node,
            theme: resolveChartTheme(colorMode),
            ...(onSelect ? { onSelect } : {}),
          })
        ),
      artifact && h(Plot, { context, artifact }),
      h(DataTable, { context, data, hidden: drawn })
    );
  };
