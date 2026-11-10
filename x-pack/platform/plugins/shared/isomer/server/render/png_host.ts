/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import Path from 'node:path';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type {
  Composition,
  KibanaChartsRenderContext,
  KibanaIsomerRuntime,
  KibanaIsomerRuntimeOptions,
  PrimitiveNode,
  ValidationError,
} from '@kbn/isomer';
import type { PngEvent } from '../instrumentation/events';
import { createLazyHeadlessRenderer } from './headless_renderer';
import { createLimiter } from './limiter';

type TakumiModule = typeof import('@elastic/isomer-image-takumi');
type TakumiBackend = ReturnType<TakumiModule['createTakumiImageBackend']>;

/**
 * Limits for drawing PNGs inside Kibana, from Isomer's guidance for a small server
 * (elastic/isomer#378): two renders in flight, a short queue, at most 2× scale, and an input
 * budget well under the charts pack's, since memory grows with the data drawn (about 185 MB over
 * loaded at 25,000 values on Linux).
 */
export const PNG_LIMITS = {
  inFlight: 2,
  queued: 8,
  maxScale: 2,
  inputBudget: { values: 25_000, characters: 1_000_000 },
} as const;

/**
 * The image width for one chart: the width a chart lays out for on Node, 480, inside the charts
 * frame's 16 px padding (the charts pack's `CHARTS_THEME.chart.width` and `frame.padding`, which
 * it doesn't export), so the image is the chart rather than a 960 px page with a chart in it.
 */
export const CHART_IMAGE_WIDTH = 480 + 2 * 16;

const FONT_DIR = Path.join(__dirname, 'fonts');

/** Inter, Latin only, at the four weights the charts and components packs draw with. */
const interLatinFonts = () =>
  [400, 500, 600, 700].map((weight) => ({
    name: 'Inter',
    weight,
    style: 'normal' as const,
    data: () => readFileSync(Path.join(FONT_DIR, `inter-latin-${weight}.woff2`)),
  }));

/** The composition is over the PNG input budget, or not a valid composition. */
export class RenderInputError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(
      i18n.translate('xpack.isomer.render.invalidInput', {
        defaultMessage: 'Kibana cannot draw this content as an image: {reasons}',
        values: {
          reasons: errors
            .map(({ path, message }) => (path ? `${path} ${message}` : message))
            .join('; '),
        },
      })
    );
    this.name = 'RenderInputError';
  }
}

export interface ChartPngOptions extends KibanaChartsRenderContext {
  /** Device pixels per CSS pixel, 1 to {@link PNG_LIMITS.maxScale}. Default 2. */
  scale?: number;
  /** The image's width in CSS pixels. Default: {@link CHART_IMAGE_WIDTH} for a node, 960 for a composition. */
  width?: number;
}

export interface ChartPngResult {
  png: Buffer;
  /** The image's size in CSS pixels; the PNG is this times `scale`. */
  width: number;
  height: number;
  scale: number;
  /** What the render cost, as reported in the `isomer_render_png` event. */
  metrics: PngEvent;
}

export interface ChartPngHost {
  /**
   * Draws a node, or a whole composition, to a PNG in Kibana's process: the `snapshot` surface,
   * headless Elastic Charts' SVG, and takumi's rasterizer. Throws {@link RenderBusyError} when the
   * host is busy and {@link RenderInputError} when the input is over the PNG budget.
   */
  renderPng(input: PrimitiveNode | Composition, options?: ChartPngOptions): Promise<ChartPngResult>;
  /** Whether the image runtime, takumi and the engine have loaded: false until the first render. */
  readonly loaded: { runtime: boolean; engine: boolean };
  close(): Promise<void>;
}

interface ImageParts {
  runtime: KibanaIsomerRuntime;
  backend: TakumiBackend;
  renderPng: TakumiModule['renderPng'];
}

const isComposition = (input: PrimitiveNode | Composition): input is Composition =>
  input.type === 'view' && Array.isArray((input as Composition).body);

export interface ChartPngHostOptions {
  logger: Logger;
  report?: (event: PngEvent) => void;
  /** Overrides how takumi loads, for tests. */
  loadTakumi?: () => TakumiModule;
}

/**
 * Kibana's in-process PNG host. Nothing loads until the first render: the image runtime (the
 * components and charts packs, with the charts frame and the PNG input budget), one takumi
 * backend with Inter Latin registered, and on the first chart, headless Elastic Charts.
 */
export const createChartPngHost = ({
  logger,
  report,
  loadTakumi = () =>
    // takumi's native binding loads on require; Node loads its CommonJS build.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@elastic/isomer-image-takumi'),
}: ChartPngHostOptions): ChartPngHost => {
  const renderContext = new AsyncLocalStorage<KibanaChartsRenderContext>();
  // `snapshot` markup is static, so the engine draws wherever the process says it is.
  const headless = createLazyHeadlessRenderer({ environments: ['node', 'browser'] });
  const limit = createLimiter(PNG_LIMITS.inFlight, PNG_LIMITS.queued);
  let parts: Promise<ImageParts> | undefined;

  const load = async (): Promise<ImageParts> => {
    const started = performance.now();
    const [
      { createKibanaIsomerRuntime, loadKibanaChartsPack },
      { componentsPackWithCharts },
      charts,
    ] = await Promise.all([
      import('@kbn/isomer'),
      import('@kbn/isomer-components'),
      import('@elastic/isomer-primitives-charts'),
    ]);
    const chartsPack = await loadKibanaChartsPack({
      environment: 'server',
      sceneRenderers: [headless],
      getRenderContext: () => renderContext.getStore(),
    });
    const runtime = createKibanaIsomerRuntime({
      packs: [componentsPackWithCharts, chartsPack],
      // The Kibana runtime's options don't name a frame theme; the charts frame reads its own.
      frames: { charts: charts.chartsFrame } as unknown as NonNullable<
        KibanaIsomerRuntimeOptions['frames']
      >,
      defaultFrame: 'charts',
      inputBudget: PNG_LIMITS.inputBudget,
    });
    const takumi = loadTakumi();
    const backend = takumi.createTakumiImageBackend({ fonts: interLatinFonts() });
    logger.debug(() => `Loaded the PNG host in ${Math.round(performance.now() - started)} ms`);
    return { runtime, backend, renderPng: takumi.renderPng };
  };

  const getParts = () => {
    parts ??= load().catch((error) => {
      parts = undefined;
      throw error;
    });
    return parts;
  };

  return {
    renderPng: async (input, { scale: requestedScale = 2, width, ...context } = {}) => {
      const scale = Math.min(Math.max(requestedScale, 1), PNG_LIMITS.maxScale);
      const requested = performance.now();
      return limit(async () => {
        const started = performance.now();
        const rssBefore = process.memoryUsage.rss();
        const engineLoadedBefore = headless.loaded;
        const { runtime, backend, renderPng } = await getParts();
        const composition: Composition = isComposition(input)
          ? input
          : { type: 'view', body: [input] };
        const { valid, errors } = runtime.validate(composition);
        if (!valid) {
          throw new RenderInputError(errors);
        }
        const result = await renderContext.run(context, () =>
          renderPng(runtime as Parameters<typeof renderPng>[0], composition, backend, {
            scale,
            snapshot: {
              frame: 'charts',
              ...(context.scheme ? { theme: context.scheme } : {}),
              ...(width || !isComposition(input) ? { width: width ?? CHART_IMAGE_WIDTH } : {}),
            },
          })
        );
        const metrics: PngEvent = {
          node_type: isComposition(input) ? 'view' : input.type,
          duration_ms: Math.round(performance.now() - started),
          queued_ms: Math.round(started - requested),
          png_bytes: result.png.byteLength,
          width: result.width,
          height: result.height,
          scale,
          rss_delta_bytes: process.memoryUsage.rss() - rssBefore,
          engine_loaded: !engineLoadedBefore && headless.loaded,
        };
        logger.debug(() => `Drew a PNG: ${JSON.stringify(metrics)}`);
        report?.(metrics);
        return { png: result.png, width: result.width, height: result.height, scale, metrics };
      });
    },
    get loaded() {
      return { runtime: parts !== undefined, engine: headless.loaded };
    },
    close: async () => {
      const loaded = await parts?.catch(() => undefined);
      await loaded?.backend.close();
    },
  };
};
