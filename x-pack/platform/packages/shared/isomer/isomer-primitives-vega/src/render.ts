/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger, parse, renderModule, resetSVGDefIds, View, Warn } from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';

import { expressionEvaluator } from './interpreter';
import { inertLoader } from './loader';
import { safeBackground, scrubScene } from './scene';
import {
  newReadRecord,
  pruneToReads,
  recordReads,
  replaceMarkers,
  resultMarker,
  type VegaResult,
  withoutTooltips,
  withResults,
} from './results';
import { hardenVegaSpec, isSpecObject, setOwn, type SpecObject, stripSpec } from './spec';
import { vegaConfig, vegaLiteConfig, type VegaTheme } from './theme';

export type VegaMode = 'vega' | 'vega-lite';

/** What a chart needs to draw: the grammar, the spec, and the box it fills. */
export interface VegaChartInput {
  mode: VegaMode;
  spec: SpecObject;
  width: number;
  height: number;
  /** Query results that replace data sources' `url`s, by path. */
  results?: readonly VegaResult[];
}

/** Vega-Lite views whose size is per cell, not the whole chart. */
const COMPOSITE_KEYS = ['concat', 'hconcat', 'vconcat', 'facet', 'repeat'];

const FIT = { type: 'fit', contains: 'padding' } as const;

/** Kibana fits a Vega spec to its panel unless the spec turns autosize off (`_compileWithAutosize`). */
const autosizeOf = (autosize: unknown) =>
  autosize === 'none' ||
  (typeof autosize === 'object' &&
    autosize !== null &&
    (autosize as { type?: unknown }).type === 'none')
    ? autosize
    : FIT;

/** Objects merge key by key; anything else in `over` replaces `base`. */
const mergeDeep = (base: SpecObject, over: unknown): SpecObject => {
  if (!isSpecObject(over)) {
    return base;
  }
  const result: SpecObject = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = result[key];
    setOwn(
      result,
      key,
      isSpecObject(current) && isSpecObject(value) ? mergeDeep(current, value) : value
    );
  }
  return result;
};

export interface VegaLog {
  errors: string[];
  warnings: string[];
}

/** A Vega logger that records errors and warnings in `log` instead of printing them. */
const silentLogger = (log: VegaLog = { errors: [], warnings: [] }) =>
  logger(Warn, undefined, (method, _level, input) => {
    // `vega-util` passes the logging call's `arguments` object.
    const message = Array.from(input as ArrayLike<unknown>, String).join(' ');
    (method === 'error' ? log.errors : log.warnings).push(message);
  });

/**
 * The Vega spec a chart renders: stripped of everything that reaches outside
 * it, compiled from Vega-Lite when needed, sized to the node, and themed under
 * the spec's own `config`.
 */
export const toVegaSpec = (
  { mode, spec, width, height, results }: VegaChartInput,
  theme: VegaTheme,
  log: VegaLog = { errors: [], warnings: [] }
): SpecObject => {
  const safe = stripSpec(withResults(spec, results));
  if (mode === 'vega-lite') {
    const composite = COMPOSITE_KEYS.some((key) => key in safe);
    const sized = composite ? safe : { ...safe, width, height, autosize: FIT };
    const { spec: compiled } = compile(sized as unknown as TopLevelSpec, {
      config: vegaLiteConfig(theme),
      logger: silentLogger(log),
    });
    return hardenVegaSpec(compiled as unknown as SpecObject);
  }
  return hardenVegaSpec({
    ...safe,
    width,
    height,
    autosize: autosizeOf(safe.autosize),
    config: mergeDeep(vegaConfig(theme), safe.config),
  });
};

/**
 * A headless view of a copy of `vegaSpec`, which Vega's parser would otherwise
 * mutate. `ast: true` plus the interpreter: no expression reaches `new Function`.
 */
export const createVegaView = (vegaSpec: SpecObject, log: VegaLog = { errors: [], warnings: [] }) =>
  new View(
    parse(JSON.parse(JSON.stringify(vegaSpec)) as SpecObject, undefined, {
      ast: true,
    }),
    {
      renderer: 'none',
      loader: inertLoader,
      expr: expressionEvaluator,
      logger: silentLogger(log),
    }
  );

/** Passes enough for autosize to re-run on the size the first pass measured. */
const MAX_PASSES = 4;

interface Queued {
  callback: (view: View) => void;
  priority: number;
}

/** The dataflow state `settle` reads and the `runAfter` it replaces. */
interface DataflowInternals {
  _pulse: unknown;
  _touched: { length: number };
  runAfter: (callback: (view: View) => void, enqueue?: boolean, priority?: number) => void;
}

/**
 * Runs the dataflow to completion synchronously. Vega awaits each callback
 * queued after a pass, such as autosize's resize, so after the first one the
 * rest run on a later tick. This queues them itself and runs them in Vega's
 * order: by priority, and depth-first, so what a callback queues runs before
 * its next sibling. Then it runs the pass they schedule.
 */
const settle = (view: View, log: VegaLog) => {
  const dataflow = view as unknown as DataflowInternals;
  const queue: Queued[] = [];
  dataflow.runAfter = (callback, enqueue = false, priority = 0) => {
    if (dataflow._pulse !== null || enqueue) {
      queue.push({ callback, priority });
    } else {
      callback(view);
    }
  };
  const drain = () => {
    const ready = queue.splice(0).sort((a, b) => b.priority - a.priority);
    for (const { callback } of ready) {
      try {
        callback(view);
      } catch (error) {
        log.errors.push(String(error));
      }
      drain();
    }
  };
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    view.run();
    drain();
    if (dataflow._touched.length === 0) {
      return;
    }
  }
};

/** Only the headless renderer's surface that this module reads. */
interface HeadlessSvgRenderer {
  initialize(
    el: null,
    width: number,
    height: number,
    origin: readonly [number, number],
    scaleFactor: number
  ): HeadlessSvgRenderer;
  background(color: unknown): HeadlessSvgRenderer;
  render(scene: unknown): HeadlessSvgRenderer;
  svg(): string | null;
}

/** `View` state `toSVG` reads through `vega-view`'s internal `render-size`. */
interface ViewInternals {
  _viewWidth: number;
  _viewHeight: number;
  _origin: [number, number];
}

const svgRenderer = (): HeadlessSvgRenderer => {
  // `vega-typings` declares only the two-argument registration form.
  const lookup = renderModule as unknown as (name: string) => {
    headless: new (loader: unknown) => HeadlessSvgRenderer;
  };
  return new (lookup('svg').headless)(inertLoader);
};

/** Markup the scrub should have made impossible; any `url(` but a reference to the chart's own defs. */
const ESCAPED = /<a[\s>]|<image\b[^>]*href="[^"]|<script|<foreignObject|url\((?!#)/i;

/** Ids Vega numbers from process-wide counters: gradients, patterns, and clip paths. */
const DEF_ID = /(id="|url\(#)((?:p_)?gradient_\d+|clip\d+)/g;

/** A short, stable hash, so a chart's def ids depend only on its spec. */
const specHash = (spec: SpecObject): string => {
  const json = JSON.stringify(spec);
  let hash = 5381;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 33 + json.charCodeAt(index)) % 4294967296;
  }
  return hash.toString(36);
};

export class VegaRenderError extends Error {
  override name = 'VegaRenderError';
}

export interface VegaSvg {
  svg: string;
  log: VegaLog;
}

/**
 * Renders `vegaSpec` to an SVG string synchronously, sized to `width` ×
 * `height` with the drawing scaled into its `viewBox`. Inline data evaluates
 * without awaiting, and {@link inertLoader} gives the renderer nothing to wait
 * for, so this matches `view.toSVG()` without its promise. Def ids are
 * numbered per chart and prefixed with a hash of its spec, so the output is
 * deterministic and two charts in one document never share an id.
 */
/** Runs `view` to completion and draws its scene as an SVG string, scrubbed of anything that fetches. */
const drawView = (view: View, log: VegaLog): string => {
  resetSVGDefIds();
  settle(view, log);
  const [failure] = log.errors;
  if (failure !== undefined) {
    throw new VegaRenderError(`vega: ${failure}`);
  }
  const scene = view.scenegraph() as unknown as { root: unknown };
  scrubScene(scene.root);
  const internals = view as unknown as ViewInternals;
  const padding = view.padding() as {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  const markup = svgRenderer()
    .initialize(
      null,
      Math.max(0, internals._viewWidth + padding.left + padding.right),
      Math.max(0, internals._viewHeight + padding.top + padding.bottom),
      [padding.left + internals._origin[0], padding.top + internals._origin[1]],
      1
    )
    .background(safeBackground(view.background()))
    .render(scene.root)
    .svg();
  if (!markup) {
    throw new VegaRenderError('vega: the renderer produced no SVG');
  }
  if (ESCAPED.test(markup)) {
    throw new VegaRenderError(
      'vega: the rendered SVG holds a link, an image source, or a fetching style'
    );
  }
  return markup;
};

export const renderVegaSvg = (
  vegaSpec: SpecObject,
  { width, height }: { width: number; height: number }
): VegaSvg => {
  const log: VegaLog = { errors: [], warnings: [] };
  const idPrefix = `isomer-vega-${specHash(vegaSpec)}-`;
  // A tooltip only shows on hover, which a static drawing never has.
  const view = createVegaView(withoutTooltips(vegaSpec), log);
  try {
    const markup = drawView(view, log);
    return {
      svg: markup
        .replace(
          /^<svg([^>]*?) width="[^"]*" height="[^"]*"/,
          `<svg$1 width="${width}" height="${height}"`
        )
        .replace(DEF_ID, `$1${idPrefix}$2`),
      log,
    };
  } finally {
    view.finalize();
  }
};

/** The SVG without its per-spec def-id prefix, to compare two drawings of one chart. */
const comparable = (svg: string) => svg.replace(/isomer-vega-[a-z0-9]+-/g, '');

/**
 * `input` with each result holding only what its static drawing reads, under every theme given. The drawing runs
 * once with each result behind read-recording proxies, then the pruned input must draw the same SVG as the full
 * one under each theme, or `input` comes back unchanged.
 */
export const pruneVegaResults = <T extends VegaChartInput>(
  input: T,
  themes: readonly VegaTheme[]
): T => {
  const results = input.results ?? [];
  if (results.length === 0) return input;
  const records = results.map(() => newReadRecord());
  const marked = {
    ...input,
    results: results.map((result, index) => ({ ...result, values: resultMarker(index) })),
  };
  try {
    for (const theme of themes) {
      const log: VegaLog = { errors: [], warnings: [] };
      const compiled = withoutTooltips(toVegaSpec(marked, theme, log));
      const found = replaceMarkers(compiled, (index) =>
        // A copy: Vega writes into rows as it runs, and the result must stay as the query returned it.
        recordReads(structuredClone(results[index]!.values), records[index]!)
      );
      // A result the compiled spec carries some other way is kept whole.
      records.forEach((record, index) => {
        if (!found.has(index)) record.all = true;
      });
      // Not `createVegaView`: its JSON copy would read everything.
      const view = new View(parse(compiled, undefined, { ast: true }), {
        renderer: 'none',
        loader: inertLoader,
        expr: expressionEvaluator,
        logger: silentLogger(log),
      });
      try {
        drawView(view, log);
      } finally {
        view.finalize();
      }
    }
    const pruned = {
      ...input,
      results: results.map((result, index) => ({
        ...result,
        values: pruneToReads(result.values, records[index]!),
      })),
    };
    for (const theme of themes) {
      const full = renderVegaSvg(toVegaSpec(input, theme), input).svg;
      const kept = renderVegaSvg(toVegaSpec(pruned, theme), input).svg;
      if (comparable(full) !== comparable(kept)) return input;
    }
    return pruned;
  } catch {
    return input;
  }
};
