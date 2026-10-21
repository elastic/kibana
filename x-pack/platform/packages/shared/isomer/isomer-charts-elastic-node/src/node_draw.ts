/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Static drawing in Node: Elastic Charts mounts into a jsdom window whose canvases draw through Skia.

import { readFileSync } from 'node:fs';

import type { ComponentType } from 'react';
import type {
  ChartArtifact,
  ChartNode,
  DrawRequest,
  LiveChartProps,
} from '@kbn/isomer-primitives-charts';
import {
  type Canvas,
  createCanvas,
  DOMMatrix,
  GlobalFonts,
  ImageData,
  Path2D,
} from '@napi-rs/canvas';
import { JSDOM } from 'jsdom';

import type { ElasticChartsEngineOptions } from '@kbn/isomer-charts-elastic';

import { euiHostStyles } from './host_styles';

export interface FontFile {
  family: string;
  /** A TTF, OTF, WOFF, or WOFF2 file, e.g. Kibana's own `assets/fonts`. */
  path: string;
}

export interface NodeDrawOptions {
  /** Registered with Skia before the first drawing; text measures and draws in these. */
  fonts?: readonly FontFile[];
  /** Device pixels per CSS pixel in the drawn images. Defaults to 2. */
  pixelRatio?: number;
}

interface Environment {
  window: JSDOM['window'];
  canvases: Map<HTMLCanvasElement, Canvas>;
  flushFrames: () => void;
  releaseCanvases: () => void;
}

let installed: Environment | undefined;

// The canvas spec draws an all-zero dash solid; Skia rejects it.
const patchLineDash = (): void => {
  const prototype = Object.getPrototypeOf(createCanvas(1, 1).getContext('2d')) as {
    setLineDash: (segments: number[]) => void;
  };
  const { setLineDash } = prototype;
  prototype.setLineDash = function solidSafe(segments: number[]) {
    setLineDash.call(this, segments.every((segment) => segment === 0) ? [] : segments);
  };
};

/**
 * jsdom's selector engine compiles selectors with `new Function`, which a server run with
 * `--disallow-code-generation-from-strings`, as packaged Kibana is, rejects; so nothing here reaches it.
 */
const chartAncestor = (element: Element): HTMLElement | null => {
  for (let at: Element | null = element; at; at = at.parentElement) {
    if (at.classList.contains('echChart')) {
      return at as HTMLElement;
    }
  }
  return null;
};

// Skia's pixels sit outside V8's heap, so garbage collection alone frees them too late.
const shrink = (canvas: Canvas): void => {
  canvas.width = 1;
  canvas.height = 1;
};

/** One jsdom window for the process, installed as globals before React DOM or Elastic Charts load. */
const install = (pixelRatio: number): Environment => {
  if (installed) {
    return installed;
  }
  patchLineDash();
  const { window } = new JSDOM('<!doctype html><html><body></body></html>');
  // Emotion's cache looks up server-rendered `style[data-emotion…]` tags when it loads; this window has none, and
  // answering without jsdom's selector engine keeps the worker within `--disallow-code-generation-from-strings`.
  const { querySelectorAll } = window.Document.prototype;
  window.Document.prototype.querySelectorAll = function emotionSafe(
    this: Document,
    selectors: string
  ) {
    return selectors.startsWith('style[data-emotion')
      ? this.createElement('template').childNodes
      : querySelectorAll.call(this, selectors);
  } as never;
  const canvases = new Map<HTMLCanvasElement, Canvas>();
  window.HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    type: string
  ) {
    if (type !== '2d') {
      return null;
    }
    const width = this.width || 1;
    const height = this.height || 1;
    let canvas = canvases.get(this);
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      if (canvas) {
        shrink(canvas);
      }
      canvas = createCanvas(width, height);
      canvases.set(this, canvas);
    }
    return canvas.getContext('2d');
  } as never;
  // Elastic Charts learns its size only from this callback, and jsdom has no layout.
  window.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(element: Element) {
      const chart = chartAncestor(element);
      const width = parseFloat(chart?.style.width ?? '') || 0;
      const height = parseFloat(chart?.style.height ?? '') || 0;
      this.callback(
        [
          {
            target: element,
            contentRect: { width, height, top: 0, left: 0 },
          } as unknown as ResizeObserverEntry,
        ],
        this
      );
    }
    unobserve() {}
    disconnect() {}
  } as never;
  // jsdom's cascade matches every rule through its selector engine; this window holds inline styles only.
  window.getComputedStyle = ((element: HTMLElement) => element.style) as never;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
  Object.defineProperty(window, 'devicePixelRatio', {
    value: pixelRatio,
    configurable: true,
  });
  const frames: FrameRequestCallback[] = [];
  let frameId = 0;
  window.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return (frameId += 1);
  };
  window.cancelAnimationFrame = () => {};
  for (const key of [
    'window',
    'document',
    'navigator',
    'Element',
    'HTMLElement',
    'HTMLCanvasElement',
    'Node',
    'Text',
    'Event',
    'MouseEvent',
    'KeyboardEvent',
    'MutationObserver',
    'DOMRect',
    'ResizeObserver',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'matchMedia',
    'devicePixelRatio',
  ]) {
    Object.defineProperty(globalThis, key, {
      value: (window as unknown as Record<string, unknown>)[key],
      configurable: true,
      writable: true,
    });
  }
  // Skia's own, so paths and pixel data drawn on its canvases are ones it accepts.
  Object.assign(globalThis, { Path2D, ImageData, DOMMatrix });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  installed = {
    window,
    canvases,
    flushFrames: () => {
      for (let round = 0; round < 50 && frames.length > 0; round += 1) {
        for (const callback of frames.splice(0)) {
          callback(window.performance.now());
        }
      }
    },
    releaseCanvases: () => {
      for (const canvas of canvases.values()) {
        shrink(canvas);
      }
      canvases.clear();
    },
  };
  return installed;
};

/** Elastic Charts 73.3.0's Metric drops a closing parenthesis, which a serialized `style` cannot recover from. */
const closeMetricGrid = (html: string): string =>
  html.replace(/repeat\((\d+), minmax\(([^()]*?), 1fr\)(?=;|")/g, 'repeat($1, minmax($2, 1fr))');

/**
 * Grid rows without `min-content`, which takumi cannot parse: content rows become `auto` and the row that
 * absorbed the free space becomes `1fr`, the same layout in a browser.
 */
const contentRows = (css: string): string =>
  css.replace(/grid-template-rows:\s*([^;"}]*)/g, (_, rows: string) =>
    rows.includes('min-content')
      ? `grid-template-rows:${rows
          .split(/\s+/)
          .map((row) => (row === 'auto' ? '1fr' : row.replace(/^(-webkit-)?min-content$/, 'auto')))
          .join(' ')}`
      : `grid-template-rows:${rows}`
  );

/**
 * Grid tracks without `auto-fill` or `auto-fit`, which takumi cannot lay out: as many `minmax(<size>px, …)` tracks as
 * fit in `width`, the count a browser computes for the chart's width. Elastic Charts' bottom legend uses them.
 */
export const fixedTracks = (css: string, width: number): string =>
  css.replace(
    /repeat\(\s*auto-(?:fill|fit)\s*,\s*minmax\(\s*([\d.]+)px\s*,([^()]*)\)\s*\)/g,
    (_, min: string, max: string) =>
      `repeat(${Math.max(1, Math.floor(width / parseFloat(min)))}, minmax(${min}px,${max}))`
  );

/** The chart as markup: each canvas becomes an image of its Skia drawing, sized as the canvas was. */
const serialize = (
  chart: HTMLElement,
  canvases: Map<HTMLCanvasElement, Canvas>,
  width: number
): string => {
  for (const element of [...chart.getElementsByTagName('canvas')]) {
    const canvas = canvases.get(element);
    const image = chart.ownerDocument.createElement('img');
    image.setAttribute('alt', '');
    image.setAttribute('style', element.getAttribute('style') ?? '');
    image.className = element.className;
    if (canvas) {
      image.setAttribute(
        'src',
        `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`
      );
    }
    element.replaceWith(image);
  }
  return fixedTracks(contentRows(closeMetricGrid(chart.outerHTML)), width);
};

export type StaticDraw = (node: ChartNode, request: DrawRequest) => ChartArtifact;

/**
 * Draws charts in this thread: installs a jsdom window as its globals on first call, so it belongs in a
 * worker, which {@link defineElasticChartsNodeEngine} starts.
 */
export const createStaticDraw = async ({
  fonts = [],
  pixelRatio = 2,
  ...options
}: ElasticChartsEngineOptions & NodeDrawOptions = {}): Promise<StaticDraw> => {
  for (const { path, family } of fonts) {
    GlobalFonts.registerFromPath(path, family);
  }
  const environment = install(pixelRatio);
  const [{ createElement }, { flushSync }, { createRoot }, engineModule] = await Promise.all([
    import('react'),
    import('react-dom'),
    import('react-dom/client'),
    import('@kbn/isomer-charts-elastic'),
  ]);
  const engine = engineModule.defineElasticChartsEngine(options);
  // Elastic Charts' stylesheet over the page it expects: EUI's global reset and body font, as in Kibana.
  const reset = euiHostStyles();
  const sheet = (path: string) =>
    `${reset}${contentRows(readFileSync(require.resolve(path), 'utf8'))}`;
  const stylesheets = {
    light: sheet('@elastic/charts/dist/theme_light.css'),
    dark: sheet('@elastic/charts/dist/theme_dark.css'),
  };
  const { document } = environment.window;
  const draw: StaticDraw = (node, { mode, theme, width, height }) => {
    const Live = engine.live?.[node.type] as ComponentType<LiveChartProps> | undefined;
    if (Live === undefined) {
      throw new Error(`no drawing for ${node.type}`);
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      flushSync(() => root.render(createElement(Live, { node, theme, width, height })));
      environment.flushFrames();
      const chart = container.getElementsByClassName('echChart')[0] as HTMLElement | undefined;
      if (!chart) {
        throw new Error(`${node.type} did not mount`);
      }
      return {
        plot: {
          kind: 'markup',
          html: serialize(chart, environment.canvases, width),
          stylesheet: stylesheets[mode],
        },
        width,
        height,
        legend: [],
      };
    } finally {
      root.unmount();
      container.remove();
      environment.releaseCanvases();
    }
  };
  return draw;
};
