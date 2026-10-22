/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCanvas, type Canvas } from '@napi-rs/canvas';
import type { ShimUsageLog } from './shim_usage_log';

/** A rectangle a host assigns an element, since jsdom has no layout engine to compute one. */
export interface ExplicitRect {
  width: number;
  height: number;
  top?: number;
  left?: number;
}

const EXPLICIT_RECT_PROP = '__reportingExplicitRect';

type ElementWithExplicitRect = Element & { [EXPLICIT_RECT_PROP]?: ExplicitRect };

/**
 * Assigns an element the rectangle Chromium's layout engine would otherwise have computed.
 * Dashboard panels get this from `gridData` (same px conversion `preserve_layout` already
 * does for element positions), Visualize standalone from `layout.dimensions`, and Canvas
 * workpad elements from their saved `position`. Call this on every element whose size
 * React/chart code reads before that code runs (ideally as each panel container mounts),
 * since nothing here observes real DOM mutations the way a browser's layout engine would.
 */
export const setExplicitRect = (element: Element, rect: ExplicitRect): void => {
  (element as ElementWithExplicitRect)[EXPLICIT_RECT_PROP] = rect;
  for (const listener of Array.from(rectChangeListeners)) {
    listener(element, rect);
  }
};

type RectChangeListener = (element: Element, rect: ExplicitRect) => void;
const rectChangeListeners = new Set<RectChangeListener>();

/**
 * Subscribes to {@link setExplicitRect} calls. `FakeResizeObserver` uses this to re-fire
 * observed targets once a rect arrives for an ancestor: components that observe their size
 * on mount (EUI's data grid, Elastic Charts' resizer) mount before the panel's rect is known.
 * Returns an unsubscribe function.
 */
export const onExplicitRectChange = (listener: RectChangeListener): (() => void) => {
  rectChangeListeners.add(listener);
  return () => {
    rectChangeListeners.delete(listener);
  };
};

const getExplicitRect = (element: Element): ExplicitRect | undefined =>
  (element as ElementWithExplicitRect)[EXPLICIT_RECT_PROP];

/**
 * An element's inline `width` and `height`, if both are pixel values: that is its size, as
 * far as any layout engine would be concerned (`react-window` sizes every cell this way).
 * Read at the moment of measurement, so it works for code that measures during mount,
 * before any host can assign a rect.
 */
const inlinePixelRect = (element: Element): ExplicitRect | undefined => {
  const style = (element as HTMLElement).style;
  if (!style) return undefined;
  const width = style.width.endsWith('px') ? parseFloat(style.width) : NaN;
  const height = style.height.endsWith('px') ? parseFloat(style.height) : NaN;
  return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : undefined;
};

/** Walks up to the nearest ancestor (or self) with an explicit rect or inline pixel size, if any. */
export const findExplicitRect = (element: Element): ExplicitRect | undefined => {
  let el: Element | null = element;
  while (el) {
    const rect = getExplicitRect(el) ?? inlinePixelRect(el);
    if (rect) return rect;
    el = el.parentElement;
  }
  return undefined;
};

// One shared 1x1 canvas purely for `measureText` calls below -- never drawn to, never
// read back, so its own pixel dimensions don't matter.
let measurementCanvas: Canvas | undefined;
const getMeasurementContext = () => {
  const canvas: Canvas = measurementCanvas ?? createCanvas(1, 1);
  measurementCanvas = canvas;
  return canvas.getContext('2d');
};

// Matches `@kbn/flot-charts`' own default label styling and the core rendering service's
// registered font (see `registerKibanaFonts` in `headless_dom_environment.ts`), so a plain
// text node with no inline font-size still measures close to what a real browser's layout
// engine would have reported.
const DEFAULT_FONT_SIZE_PX = 13;
const DEFAULT_FONT_FAMILY = 'Inter, sans-serif';
const DEFAULT_LINE_HEIGHT_FACTOR = 1.4;

/**
 * A size estimate for a leaf, text-only element with no explicit rect anywhere up its
 * ancestor chain, using the real font-metrics `measureText` the skia canvas backend already
 * provides (`registerKibanaFonts` registers the same font files a real browser would use) --
 * as close to what a real layout engine would compute as this package gets without one.
 *
 * Phase 5's Tier 6 finding: `@kbn/flot-charts`' `text.js` plugin (the "value label" numbers
 * overlay Canvas workpad's `plot`/`pie` functions enable) creates a bare `<div class=
 * "valueLabel">`, appends it to the chart placeholder, then reads `$(div).width()`/
 * `.height()` (`offsetWidth`/`offsetHeight`) to center it over its data point -- before this
 * fallback, that read `0` every time (jsdom has no layout engine and nothing calls
 * `setExplicitRect` on these dynamically-created label nodes), silently drawing every value
 * label's top-left corner at the intended *center* point instead of actually centering it.
 * Only applies to leaf elements (no children): an element with child elements needs a real
 * layout pass to size correctly, which measuring one node's own text can't substitute for,
 * so those deliberately keep falling back to `0` per this shim's existing "surface it, don't
 * guess" design.
 */
const measureTextRect = (element: Element): ExplicitRect | undefined => {
  if (element.children.length > 0) return undefined;
  const text = element.textContent;
  if (!text) return undefined;

  const style = (element as HTMLElement).style;
  const fontSizePx = parseFloat(style?.fontSize ?? '') || DEFAULT_FONT_SIZE_PX;
  const fontFamily = style?.fontFamily || DEFAULT_FONT_FAMILY;
  const fontWeight = style?.fontWeight || 'normal';

  const ctx = getMeasurementContext();
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  const { width } = ctx.measureText(text);

  return { width, height: fontSizePx * DEFAULT_LINE_HEIGHT_FACTOR };
};

/**
 * Installs the layout shim on a jsdom `window`: `offsetWidth`/`offsetHeight`/`clientWidth`/
 * `clientHeight` and `getBoundingClientRect()` answer from the nearest explicit rect set via
 * {@link setExplicitRect} (inherited down the tree, so a chart's inner `<div>`s get their
 * container's size without every single one needing its own explicit rect); failing that,
 * a leaf text-only element gets a real `measureText`-based estimate (see
 * `measureTextRect`'s doc comment -- Phase 5's Tier 6 finding); failing that too, falls back
 * to `0` the way an unattached/unlaid-out jsdom element already does today -- that fallback,
 * not a guessed default, is what should surface a panel type that needs its own explicit
 * rect wiring, rather than silently rendering at an arbitrary size.
 */
export const installLayoutShim = (
  window: { HTMLElement: { prototype: HTMLElement } },
  usageLog: ShimUsageLog
): void => {
  const proto = window.HTMLElement.prototype;

  const rectFor = (element: Element): ExplicitRect | undefined => {
    const rect = findExplicitRect(element);
    if (rect) {
      usageLog.record('layout.explicitRect', element.tagName.toLowerCase());
      return rect;
    }
    const measured = measureTextRect(element);
    if (measured) {
      usageLog.record('layout.measureTextFallback', element.tagName.toLowerCase());
      return measured;
    }
    return undefined;
  };

  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return rectFor(this)?.width ?? 0;
    },
  });
  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return rectFor(this)?.height ?? 0;
    },
  });
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return rectFor(this)?.width ?? 0;
    },
  });
  Object.defineProperty(proto, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return rectFor(this)?.height ?? 0;
    },
  });

  proto.getBoundingClientRect = function (this: HTMLElement) {
    const rect = rectFor(this) ?? { width: 0, height: 0, top: 0, left: 0 };
    const top = rect.top ?? 0;
    const left = rect.left ?? 0;
    return {
      width: rect.width,
      height: rect.height,
      top,
      left,
      right: left + rect.width,
      bottom: top + rect.height,
      x: left,
      y: top,
      toJSON() {
        return this;
      },
    } as DOMRect;
  };
};

/**
 * `window.matchMedia` always reports no-match for any query: there's no real viewport to
 * evaluate media queries against. Reporting already renders every panel at a fixed,
 * known size (the same preserve-layout dimensions the layout shim above uses), so
 * responsive-design breakpoints have nothing meaningful to key off here; code that
 * branches on `matchMedia` for print-vs-screen or prefers-color-scheme gets the
 * conservative "doesn't match" answer rather than a guess.
 */
export const installMatchMediaShim = (
  window: { matchMedia?: unknown },
  usageLog: ShimUsageLog
): void => {
  window.matchMedia = (query: string) => {
    usageLog.record('matchMedia', query);
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
};

/**
 * A fake `IntersectionObserver`: since every panel is rendered at its final, fixed position
 * with no real scrolling, everything observed is reported as 100% intersecting immediately
 * on `observe()` -- the same "report the static truth synchronously" approach as
 * `FakeResizeObserver` in `headless_dom_environment.ts`, for the same reason (virtualized
 * lists/grids use this to decide what's "visible enough" to render, and in a report
 * everything should render).
 */
export const installIntersectionObserverShim = (
  window: { IntersectionObserver?: unknown },
  usageLog: ShimUsageLog
): void => {
  class FakeIntersectionObserver {
    constructor(private callback: IntersectionObserverCallback) {}

    observe(target: Element) {
      usageLog.record('IntersectionObserver.observe', target.tagName.toLowerCase());
      const rect = target.getBoundingClientRect();
      this.callback(
        [
          {
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: rect,
            time: 0,
          } as unknown as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver
      );
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  window.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
};

/**
 * Patches `performance.mark`/`measure`/`clearMarks`/`clearMeasures`/`getEntriesByName`/
 * `getEntriesByType` onto jsdom's `Performance` object when missing -- jsdom implements
 * `performance.now()` but not the (unrelated) User Timing API, which Kibana's own
 * `bootstrap.js` and core bundle call unconditionally for internal load-time telemetry
 * (`performance.mark('kbnLoad', ...)`).
 *
 * This keeps real mark timestamps and computes real `measure` durations from them (rather
 * than true no-ops that return `undefined`/`[]`): `CoreSystem.reportKibanaLoadedEvent`
 * reads `performance.measure(...)`'s returned entry's `duration` and reports it as a
 * `performance_metric` analytics event with a `number`-typed `duration` field. A no-op
 * `measure` yields `duration: undefined`, which fails that event's schema validation --
 * and because `AnalyticsClient.reportEvent` rejects asynchronously, with nothing in this
 * headless environment attached to catch it, that rejection was unhandled at the Node
 * process level, which crashes the *entire* Kibana server (not just this one report's
 * render) -- confirmed live against a dev Kibana. Marks/measures that don't exist read back
 * from `performance.now()` at zero elapsed time, so any caller still gets a real number.
 */
export const installPerformanceMarkShim = (
  window: { performance?: Record<string, unknown> },
  usageLog: ShimUsageLog
): void => {
  const { performance } = window;
  if (!performance) return;
  const now = performance.now as () => number;

  interface TimingEntry {
    name: string;
    entryType: 'mark' | 'measure';
    startTime: number;
    duration: number;
  }
  const entries: TimingEntry[] = [];

  if (typeof performance.mark !== 'function') {
    performance.mark = (name: string) => {
      usageLog.record('performance.mark', name);
      entries.push({ name, entryType: 'mark', startTime: now.call(performance), duration: 0 });
    };
  }
  if (typeof performance.measure !== 'function') {
    performance.measure = (name: string, startMarkName?: string, endMarkName?: string) => {
      usageLog.record('performance.measure', name);
      const startMark = startMarkName
        ? entries.find((entry) => entry.name === startMarkName)
        : undefined;
      const endMark = endMarkName ? entries.find((entry) => entry.name === endMarkName) : undefined;
      const startTime = startMark?.startTime ?? 0;
      const endTime = endMark?.startTime ?? now.call(performance);
      const entry: TimingEntry = {
        name,
        entryType: 'measure',
        startTime,
        duration: Math.max(0, endTime - startTime),
      };
      entries.push(entry);
      return entry;
    };
  }
  if (typeof performance.clearMarks !== 'function') {
    performance.clearMarks = (name?: string) => {
      usageLog.record('performance.clearMarks', name);
      removeEntries(entries, 'mark', name);
    };
  }
  if (typeof performance.clearMeasures !== 'function') {
    performance.clearMeasures = (name?: string) => {
      usageLog.record('performance.clearMeasures', name);
      removeEntries(entries, 'measure', name);
    };
  }
  if (typeof performance.getEntriesByName !== 'function') {
    performance.getEntriesByName = (name: string, entryType?: string) =>
      entries.filter(
        (entry) => entry.name === name && (!entryType || entry.entryType === entryType)
      );
  }
  if (typeof performance.getEntriesByType !== 'function') {
    performance.getEntriesByType = (entryType: string) =>
      entries.filter((entry) => entry.entryType === entryType);
  }
};

const removeEntries = (
  entries: Array<{ name: string; entryType: 'mark' | 'measure' }>,
  entryType: 'mark' | 'measure',
  name?: string
): void => {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.entryType === entryType && (!name || entry.name === name)) {
      entries.splice(i, 1);
    }
  }
};

/** `window.scrollTo`/`scroll` are no-ops: reports render the whole page, nothing scrolls. */
export const installScrollShim = (
  window: { scrollTo?: unknown; scroll?: unknown },
  usageLog: ShimUsageLog
): void => {
  const noop = (...args: unknown[]) => {
    usageLog.record('scrollTo', JSON.stringify(args));
  };
  window.scrollTo = noop;
  window.scroll = noop;
};
