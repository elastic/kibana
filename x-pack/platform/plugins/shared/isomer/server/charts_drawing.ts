/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createChildNodeWalker, type Composition } from '@elastic/isomer-sdk';
import { createTakumiImageBackend, type TakumiPdfMetadata } from '@elastic/isomer-image-takumi';
import { createKibanaIsomerRuntime, type KibanaIsomerRuntime } from '@kbn/isomer';
import type { ChartHints } from '@kbn/isomer-charts-elastic';
import { componentsPack } from '@kbn/isomer-components';
import {
  defineChartsPack,
  prepareCharts,
  type ChartEngine,
  type PrepareChartsOptions,
} from '@kbn/isomer-primitives-charts';
import { DASHBOARD_FRAME, dashboardFrame, dashboardPack } from '@kbn/isomer-primitives-dashboard';
import { cardContentWidth, kibanaCardFrame } from '@kbn/isomer-theme';
import { defineMapsPack, type MapGeometry } from '@kbn/isomer-primitives-maps';
import { vegaPack } from '@kbn/isomer-primitives-vega';
import { fromRoot } from '@kbn/repo-info';

import { hoistStyles, withoutMasks } from './hoist_styles';

const FONTS = fromRoot('src/core/packages/apps/server-internal/assets/fonts');

/** The faces Elastic Charts' Borealis theme names, from Kibana's own assets. */
const FACES = [
  ['Inter', 'inter/Inter-Regular.woff2'],
  ['Inter', 'inter/Inter-Medium.woff2'],
  ['Inter', 'inter/Inter-SemiBold.woff2'],
  ['Inter', 'inter/Inter-Bold.woff2'],
  ['Elastic UI Numeric', 'elastic_ui_numeric/ElasticUINumeric-Variable.woff2'],
] as const;

/** The size every chart draws at: the snapshot card frame's content width. */
export const DEFAULT_CHART_SIZE = { width: cardContentWidth(), height: 300 };

export interface DrawnRender {
  /** `html` markup, or a base64 PNG of the `snapshot` surface. */
  output: string;
  timings: { prepareMs: number; renderMs: number };
}

type Packs = Parameters<typeof createKibanaIsomerRuntime>[0]['packs'];

/** How a composition is drawn: the page, and the size and presentation of each chart in it. */
export interface DrawOptions {
  /** The `snapshot` frame; defaults to the runtime's card. */
  frame?: string;
  /** The page width, in CSS pixels; defaults to the frame's. */
  width?: number;
  /** The page height; defaults to the frame's estimate. */
  height?: number;
  theme?: 'light' | 'dark';
  /** The size charts draw at, unless `sizeFor` gives one. Defaults to {@link DEFAULT_CHART_SIZE}. */
  chartSize?: { width: number; height: number };
  sizeFor?: PrepareChartsOptions['sizeFor'];
  hintFor?: PrepareChartsOptions['hintFor'];
}

/** The drawing contract on the `isomer` plugin's start contract. */
export interface IsomerDrawing {
  /** The drawing runtime: the plugin's packs, with charts drawn by Elastic Charts. */
  runtime: KibanaIsomerRuntime;
  /** The `html` surface, its charts drawn. */
  drawHtml(composition: Composition, options?: DrawOptions): Promise<string>;
  /** The `snapshot` surface as a PNG. `scale` 2 gives a 2x raster. */
  drawPng(composition: Composition, options?: DrawOptions & { scale?: number }): Promise<Buffer>;
  /** The `snapshot` surface as a one-page PDF, the page the frame's size, with selectable text. */
  drawPdf(
    composition: Composition,
    options?: DrawOptions & { metadata?: TakumiPdfMetadata }
  ): Promise<Buffer>;
}

export interface ChartsDrawing extends IsomerDrawing {
  /** One node's `html`, its charts drawn at `size`, with the stylesheets the surface inlined split out. */
  renderNode(
    node: Composition['body'][number],
    size: { width: number; height: number }
  ): Promise<{ html: string; css: string }>;
  /** A page of markup as a PNG, through the same rasterizer and fonts as `snapshot`. */
  rasterize(
    page: { html: string; css: string; width: number; height: number },
    scale: number
  ): Promise<Buffer>;
  /** Stops the chart drawing and PDF threads. */
  close(): Promise<void>;
  render(
    composition: Composition,
    surface: 'html' | 'snapshot',
    size?: { width: number; height: number }
  ): Promise<DrawnRender>;
}

/**
 * Draws the charts pack server side with Elastic Charts in a jsdom window, in a worker thread, and the snapshot
 * surface to PNG with takumi. Resolves once that thread can draw.
 */
export const createChartsDrawing = async ({
  hints,
  geometry,
  packs = [],
  inline = false,
  pdf = true,
}: {
  hints?: ChartHints;
  /** Boundary files for the maps pack, which ships none. */
  geometry?: MapGeometry;
  /** Packs drawn beside the plugin's own, e.g. a dashboard grid. */
  packs?: Packs;
  /**
   * Draws charts in this thread instead of a worker. It installs jsdom's globals here and blocks while drawing,
   * so only a process that does nothing else should set it (see `render_host`).
   */
  inline?: boolean;
  /** Whether `drawPdf` may write; off, it rejects and the PDF thread never starts. */
  pdf?: boolean;
} = {}): Promise<ChartsDrawing> => {
  const { defineElasticChartsInlineEngine, defineElasticChartsNodeEngine } = await import(
    '@kbn/isomer-charts-elastic-node'
  );
  const engineOptions = {
    ...(hints ? { hints } : {}),
    fonts: FACES.map(([family, file]) => ({ family, path: join(FONTS, file) })),
  };
  const engine: ChartEngine & { close?: () => Promise<void> } = inline
    ? await defineElasticChartsInlineEngine(engineOptions)
    : await defineElasticChartsNodeEngine(engineOptions);
  // The snapshot surface draws in the runtime's default card frame; charts size themselves for it at DEFAULT_CHART_SIZE.
  const runtime = createKibanaIsomerRuntime({
    // The card for a composition; a dashboard's page for a dashboard.
    frames: { card: kibanaCardFrame, [DASHBOARD_FRAME]: dashboardFrame },
    defaultFrame: 'card',
    packs: [
      componentsPack,
      vegaPack,
      defineChartsPack(engine, { drawHeight: DEFAULT_CHART_SIZE.height }),
      defineMapsPack(geometry ? { geometry } : {}),
      dashboardPack,
      ...packs,
    ],
  });
  const walk = createChildNodeWalker(runtime.primitives);
  const takumi = createTakumiImageBackend({
    fonts: FACES.map(([, file]) => readFileSync(join(FONTS, file))),
  });
  // Draws every chart the composition holds, runs `render`, then lets the drawings go.
  const withCharts = async <T>(
    composition: Composition,
    { chartSize = DEFAULT_CHART_SIZE, sizeFor, hintFor, theme = 'light' }: DrawOptions,
    render: () => T | Promise<T>
  ): Promise<T> => {
    const { release } = await prepareCharts(engine, composition, {
      walk,
      mode: theme,
      ...chartSize,
      ...(sizeFor ? { sizeFor } : {}),
      ...(hintFor ? { hintFor } : {}),
    });
    try {
      return await render();
    } finally {
      release();
    }
  };
  const snapshot = (composition: Composition, { frame, width, height, theme }: DrawOptions) =>
    hoistStyles(
      runtime.surfaces.snapshot.render(composition, {
        ...(frame ? { frame } : {}),
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        ...(theme ? { theme } : {}),
      })
    );
  return {
    runtime,
    drawHtml: (composition, options = {}) =>
      withCharts(composition, options, () => runtime.surfaces.html.render(composition).html),
    drawPng: (composition, { scale, ...options } = {}) =>
      withCharts(composition, options, () =>
        takumi.png(snapshot(composition, options), scale ? { scale } : {})
      ),
    drawPdf: (composition, { metadata, ...options } = {}) =>
      pdf
        ? withCharts(composition, options, () => {
            // The PDF writer drops content under a mask (request 15).
            const { html, css, width, height } = withoutMasks(snapshot(composition, options));
            return takumi.pdf(
              { pages: [{ html }], css, width, height },
              { uncoveredText: 'placeholder', ...(metadata ? { metadata } : {}) }
            );
          })
        : Promise.reject(new Error('PDF drawing is off for this drawing')),
    renderNode: async (node, { width, height }) => {
      const composition = { type: 'view', body: [node] } as Composition;
      const { release } = await prepareCharts(engine, composition, {
        walk,
        mode: 'light',
        width,
        height,
      });
      try {
        const { html } = runtime.surfaces.html.render(composition);
        const css: string[] = [];
        return {
          html: html.replace(/<style>([\s\S]*?)<\/style>/g, (_, sheet: string) => {
            css.push(sheet);
            return '';
          }),
          css: css.join('\n'),
        };
      } finally {
        release();
      }
    },
    rasterize: (page, scale) => takumi.png(page, { scale }),
    close: async () => {
      await Promise.all([engine.close?.(), takumi.close()]);
    },
    render: async (composition, surface, { width, height } = DEFAULT_CHART_SIZE) => {
      const started = performance.now();
      const { release } = await prepareCharts(engine, composition, {
        walk,
        mode: 'light',
        width,
        height,
      });
      const prepared = performance.now();
      try {
        const output =
          surface === 'html'
            ? runtime.surfaces.html.render(composition).html
            : (
                await takumi.png(runtime.surfaces.snapshot!.render(composition, { frame: 'card' }))
              ).toString('base64');
        return {
          output,
          timings: {
            prepareMs: Math.round(prepared - started),
            renderMs: Math.round(performance.now() - prepared),
          },
        };
      } finally {
        release();
      }
    },
  };
};
