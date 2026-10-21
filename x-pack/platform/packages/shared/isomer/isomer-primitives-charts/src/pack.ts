/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import {
  type AnyPrimitiveDefinition,
  definePrimitiveFor,
  definePrimitivePack,
  type Frame,
  type PrimitivePack,
  type ThemePair,
} from '@elastic/isomer-sdk';
import { borealisDark, borealisLight } from '@kbn/isomer-theme';

import type { ChartDefinition } from './charts/define';
import type { ChartEngine, ChartNode } from './engine/types';
import { chartDefinitions } from './registry';
import { type ChartPackTypes, type ChartsFrameTheme, colorModeOf } from './render/context';
import { chartReact, type ChartSeam } from './render/figure';
import { type ChartHeading, chartMarkdown, chartSlack, chartText } from './render/surfaces';
import { chartDistillery, chartRoot } from './theme/distillery';
import { type ColorMode, resolveChartTheme } from './theme/resolve';
import { createDistillateStyleAdapter } from './theme/style_adapter';

const definePrimitive = definePrimitiveFor<ChartPackTypes>();

export interface ChartsPackOptions {
  /**
   * `live` mounts the engine's components in a client-side React tree; `static` draws from what
   * `prepareCharts` drew. A renderer cannot tell the two apart, so a host that needs both builds a pack each.
   * Defaults to `static`.
   */
  render?: 'live' | 'static';
  /** The mode on surfaces that name none (`react`, `html`); `snapshot` takes its frame's. Defaults to `light`. */
  colorMode?: ColorMode;
  /** The height an engine draws each chart at on `snapshot`, which the card frame sizes for. Defaults to the figure height. */
  drawHeight?: number;
}

// Estimated card heights, at the figure's 14px body and 12px caption: a line of text, and a table row.
const LINE = 22;
const ROW = 27;

const snapshotHeight =
  <TNode extends ChartNode & ChartHeading>(read: ChartDefinition<TNode>['read'], seam: ChartSeam) =>
  (node: TNode): number => {
    const headings = (node.title === undefined ? 0 : LINE) + (node.description === undefined ? 0 : LINE);
    if (seam.engine) {
      return headings + seam.drawHeight + LINE;
    }
    const { rows } = read(node).table;
    return headings + LINE + (rows.length + 1) * ROW + LINE;
  };

const bind = <TNode extends ChartNode & ChartHeading>(
  { type, catalog, examples, schema, read }: ChartDefinition<TNode>,
  seam: ChartSeam
): AnyPrimitiveDefinition =>
  definePrimitive<TNode>({
    type,
    catalog,
    examples: [...examples],
    schema: schema as never,
    renderers: {
      react: chartReact(read, seam),
      text: (node) => chartText(node, read(node)),
      markdown: (node) => chartMarkdown(node, read(node)),
      slack: (node) => chartSlack(node, read(node)),
    },
    metrics: { snapshotHeight: snapshotHeight(read, seam) },
  });

/**
 * The charts pack, drawn by `engine`. Without one, every chart renders its data table.
 * With an engine, every chart type is a Slack asset: with an asset collector, Slack gets the `snapshot` drawing.
 */
export const defineChartsPack = (
  engine?: ChartEngine,
  {
    render = 'static',
    colorMode = 'light',
    drawHeight = parseFloat(chartDistillery.resolveValues('light').figure.height),
  }: ChartsPackOptions = {}
): PrimitivePack<ChartsFrameTheme> => {
  const seam: ChartSeam = { ...(engine ? { engine } : {}), render, colorMode, drawHeight };
  return definePrimitivePack<ChartsFrameTheme>({
    id: 'charts',
    primitives: chartDefinitions.map((definition) =>
      bind<ChartNode & ChartHeading>(definition, seam)
    ),
    styleAdapter: createDistillateStyleAdapter(chartDistillery),
    ...(engine ? { slackAssetTypes: chartDefinitions.map(({ type }) => type) } : {}),
  });
};

export const chartThemes: ThemePair<ChartsFrameTheme> = {
  light: borealisLight,
  dark: borealisDark,
};

const { frame } = chartDistillery.resolveValues('light');

/** A card a `snapshot` render of charts is drawn into: one column, the theme's surface behind it. */
export const chartCardFrame: Frame<ChartsFrameTheme> = {
  defaultWidth: parseFloat(frame.width),
  theme: chartThemes,
  estimateHeight: ({ body }) =>
    body.length * (parseFloat(frame.chartHeight) + parseFloat(frame.gap)) +
    parseFloat(frame.padding) * 2,
  wrap: (_composition, body, { width, height, theme }) =>
    createElement(
      'div',
      {
        className: chartRoot,
        style: {
          background: resolveChartTheme(colorModeOf(theme)).surface,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: frame.gap,
          height,
          padding: frame.padding,
          width,
        },
      },
      body
    ),
};

/** The charts pack without an engine: every chart renders as its title, description, summary, and data table. */
export const chartsPack = defineChartsPack();
