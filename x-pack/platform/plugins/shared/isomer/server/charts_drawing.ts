/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createChildNodeWalker, type Composition } from '@elastic/isomer-sdk';
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createKibanaIsomerRuntime, type KibanaIsomerRuntime } from '@kbn/isomer';
import type { ChartHints } from '@kbn/isomer-charts-elastic';
import { componentsPack } from '@kbn/isomer-components';
import { defineChartsPack, prepareCharts } from '@kbn/isomer-primitives-charts';
import { cardContentWidth } from '@kbn/isomer-theme';
import { defineMapsPack, type MapGeometry } from '@kbn/isomer-primitives-maps';
import { vegaPack } from '@kbn/isomer-primitives-vega';
import { fromRoot } from '@kbn/repo-info';

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

export interface ChartsDrawing {
  runtime: KibanaIsomerRuntime;
  /** Stops the drawing thread. */
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
}: {
  hints?: ChartHints;
  /** Boundary files for the maps pack, which ships none. */
  geometry?: MapGeometry;
} = {}): Promise<ChartsDrawing> => {
  const { defineElasticChartsNodeEngine } = await import('@kbn/isomer-charts-elastic-node');
  const engine = await defineElasticChartsNodeEngine({
    ...(hints ? { hints } : {}),
    fonts: FACES.map(([family, file]) => ({ family, path: join(FONTS, file) })),
  });
  // The snapshot surface draws in the runtime's default card frame; charts size themselves for it at DEFAULT_CHART_SIZE.
  const runtime = createKibanaIsomerRuntime({
    packs: [
      componentsPack,
      vegaPack,
      defineChartsPack(engine, { drawHeight: DEFAULT_CHART_SIZE.height }),
      defineMapsPack(geometry ? { geometry } : {}),
    ],
  });
  const walk = createChildNodeWalker(runtime.primitives);
  const takumi = createTakumiImageBackend({
    fonts: FACES.map(([, file]) => readFileSync(join(FONTS, file))),
  });
  return {
    runtime,
    close: () => engine.close(),
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
