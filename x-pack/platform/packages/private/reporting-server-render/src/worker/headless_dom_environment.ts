/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import type { JSDOM as JSDOMType } from 'jsdom';
import {
  createCanvas,
  GlobalFonts,
  Path2D,
  ImageData,
  Image,
  DOMMatrix,
  DOMPoint,
  DOMRect,
  type Canvas,
} from '@napi-rs/canvas';
import type { LoopbackHttpClient } from '../services/loopback_http_client';
import {
  findExplicitRect,
  onExplicitRectChange,
  setExplicitRect,
  installLayoutShim,
  installMatchMediaShim,
  installIntersectionObserverShim,
  installScrollShim,
  installPerformanceMarkShim,
} from './layout_shim';
import { installStyleSheetRecorder } from './collect_page_css';
import { createComputedStyleProvider } from './computed_style';
import { createWebGLStub } from './webgl_stub';
import { installImageLoaderShim, unwrapDrawable } from './image_loader_shim';
import { FALLBACK_FONT, FONT_ASSETS_DIR, KIBANA_FONT_FILES } from './fonts';
import { ShimUsageLog } from './shim_usage_log';
// `jsdom` and `./jsdom_selector_compat` are loaded below via plain `require()`, not `import`,
// and deliberately kept out of the import block above: both TypeScript/Babel's CommonJS
// interop and `eslint-plugin-import`'s `import/order` rule hoist/reorder `import` statements
// (by source, then alphabetically), which previously reordered a correct `import` of these
// two modules into the wrong order under the hood, silently defeating the ordering
// requirement documented in `jsdom_selector_compat.ts`. Plain `require()` calls are ordinary
// statements that execute exactly where they're written, so this ordering is robust to both.
// eslint-disable-next-line @typescript-eslint/no-var-requires, import/order
const compatMod = require('./jsdom_selector_compat') as typeof import('./jsdom_selector_compat');
const { installSelectorEngine } = compatMod;
// import/order would otherwise force this above the previous line, which is exactly the
// wrong order (see the comment above); deliberately disabled here, not auto-fixable.
// eslint-disable-next-line @typescript-eslint/no-var-requires, import/order
const jsdomModule = require('jsdom') as typeof import('jsdom');
const { JSDOM } = jsdomModule;
// `./loopback_resource_loader` itself does `require('jsdom')` to subclass `ResourceLoader`;
// it must also come after the two lines above for the same reason.
type LoopbackMod = typeof import('./loopback_resource_loader');
// eslint-disable-next-line @typescript-eslint/no-var-requires, import/order
const loopbackMod = require('./loopback_resource_loader') as LoopbackMod;
const { installLoopbackFetch, installLoopbackXhr, LoopbackResourceLoader } = loopbackMod;

// Captured once at module load, before the `globals` loop below ever runs: a bare `Request`
// reference anywhere in this module resolves through the global object (there's no local
// `import`/declaration shadowing it), so after that loop reassigns `globalThis.Request` to
// `WindowRequest`, a plain `new Request(...)` call inside `WindowRequest`'s own body would
// otherwise recurse into itself instead of reaching Node's real implementation.
const NativeRequest = Request;

let fontsRegistered = false;

/** Registers Kibana's bundled Inter and Elastic UI Numeric fonts with the skia canvas backend, once per process. */
export const registerKibanaFonts = () => {
  if (fontsRegistered) return;
  for (const { family, file } of KIBANA_FONT_FILES) {
    GlobalFonts.registerFromPath(Path.join(FONT_ASSETS_DIR, file), family);
  }
  GlobalFonts.registerFromPath(FALLBACK_FONT.file, FALLBACK_FONT.family);
  fontsRegistered = true;
};

/** An explicit size a host sets on an element before mounting, since jsdom never computes real layout. */
export interface ExplicitSize {
  width: number;
  height: number;
}

declare module 'jsdom' {
  // Augment the small surface we actually touch; avoids `any` at call sites below.
  interface DOMWindow {
    ResizeObserver: typeof FakeResizeObserver;
  }
}

/**
 * A `ResizeObserver` that has no real layout engine to observe: it reports whatever
 * explicit size the host attached to the element (`__explicitSize`), falling back to a
 * default. This is the mechanism noted in the Slack thread: "jsdom has no layout, so
 * `ResizeObserver` reports the chart's explicit size."
 */
/**
 * A no-op `EventSource`: only ever instantiated by rspack's dev-mode HMR client
 * (`@kbn/rspack-optimizer/src/hmr/hmr_client.js`'s `connect()`), which isn't a Node/jsdom
 * global and isn't present in production-built bundles at all (HMR is dev-server-only). A
 * report render has no legitimate reason to hold open a live server-sent-events connection,
 * so this simply never calls back, rather than attempting a real one through the loopback
 * client.
 *
 * A plain constructor function, not a `class` (this file already has one real `class`,
 * `FakeResizeObserver`, below; see `loopback_xhr.ts`'s doc comment for why additional
 * `class`es are avoided here rather than adding more -- `max-classes-per-file`).
 */
function NoopEventSource(this: unknown, _url: string) {
  Object.assign(this as object, {
    readyState: NoopEventSource.CONNECTING,
    onopen: null,
    onmessage: null,
    onerror: null,
    addEventListener() {},
    removeEventListener() {},
    close() {},
  });
}
NoopEventSource.CONNECTING = 0;
NoopEventSource.OPEN = 1;
NoopEventSource.CLOSED = 2;

/**
 * A no-op `Worker`: real dedicated Web Workers (`kbn-ui-shared-deps-src`'s bundled Monaco
 * editor workers, for syntax highlighting in code-editor UI) have no jsdom-native
 * equivalent and no legitimate role in rendering a dashboard panel to an image -- nothing
 * posted to this worker is ever answered, the same trade-off as `NoopEventSource` above.
 * A panel type that turns out to depend on a real worker's response to render at all would
 * need its own dedicated shim (tracked via the usage log), not a generic one.
 */
function NoopWorker(this: unknown, _scriptUrl: string, _options?: unknown) {
  const listeners: Array<(event: { data: unknown }) => void> = [];
  const self = this as Record<string, unknown>;
  Object.assign(self, {
    onmessage: null,
    onerror: null,
    // MapLibre GL JS (the Maps embeddable, Vega map views) loads vector tiles in a worker
    // and fires its `load` event only once every tile is loaded *or errored*. No tile ever
    // loads here -- pixels come from MapLibre Native -- so a vector/DEM tile request is
    // answered as a 404 ("no tile"), which MapLibre treats as an empty tile. Without it a
    // style with a vector source never reaches `load` (a Vega map view waits for exactly
    // that). Everything else is still swallowed: its callers don't wait on an answer.
    postMessage(message: {
      id?: string;
      type?: string;
      targetMapId?: unknown;
      data?: { type?: string };
    }) {
      const isTileRequest =
        message?.type === 'LDT' ||
        ((message?.type === 'LT' || message?.type === 'RT') &&
          (message.data?.type === 'vector' || message.data?.type === 'raster-dem'));
      if (!isTileRequest || message.id === undefined) return;
      const response = {
        id: message.id,
        type: '<response>',
        sourceMapId: message.targetMapId ?? null,
        error: { name: 'Error', message: 'Tiles are not loaded in a report render', status: 404 },
        data: null,
      };
      queueMicrotask(() => {
        for (const listener of listeners) listener({ data: response });
        const handler = self.onmessage as ((event: { data: unknown }) => void) | null;
        handler?.({ data: response });
      });
    },
    terminate() {},
    addEventListener(type: string, listener: (event: { data: unknown }) => void) {
      if (type === 'message') listeners.push(listener);
    },
    removeEventListener(type: string, listener: (event: { data: unknown }) => void) {
      const index = listeners.indexOf(listener);
      if (type === 'message' && index !== -1) listeners.splice(index, 1);
    },
  });
}

/**
 * A no-op `PerformanceObserver`: `@kbn/core`'s `AnalyticsService` (`trackPerformanceMeasureEntries`)
 * constructs one unconditionally to report Web Vitals / long-task telemetry, which has no
 * meaningful equivalent in a headless render with no real paint/layout pipeline. Like
 * `installPerformanceMarkShim`'s `performance.mark`/`measure` no-ops, this exists purely so
 * the constructor call doesn't throw; it never actually observes or calls back.
 */
function NoopPerformanceObserver(this: unknown, _callback: unknown) {
  Object.assign(this as object, {
    observe() {},
    disconnect() {},
    takeRecords(): unknown[] {
      return [];
    },
  });
}
NoopPerformanceObserver.supportedEntryTypes = [] as string[];

/**
 * A no-op `BroadcastChannel`: the security plugin's `SessionTimeout` service
 * (`x-pack/platform/plugins/shared/security/public/session/session_timeout.ts`) constructs
 * one unconditionally during `CoreSystem.start()` to sync session-expiry state across real
 * browser tabs -- a single headless worker rendering one report has no other tab to sync
 * with. Phase 4's Tier 5 verification found this throwing a bare `ReferenceError` (not
 * caught anywhere) aborts `SecurityPlugin.start()` partway through, which left enough of
 * `CoreSystem.start()` not run that the Lens expression renderer never mounted any content
 * for an `lnsDatatable` panel even though `renderComplete` still fired -- a silent,
 * false-positive "complete" render that no earlier Tier (whose proof dashboards never
 * exercised this particular `CoreSystem.start()` code path) had surfaced.
 */
function NoopBroadcastChannel(this: unknown, _name: string) {
  Object.assign(this as object, {
    name: _name,
    onmessage: null,
    onmessageerror: null,
    postMessage() {},
    close() {},
    addEventListener() {},
    removeEventListener() {},
  });
}

/** Set by `createHeadlessDomEnvironment`; lets the module-level observer class report unwired targets. */
let activeUsageLog: ShimUsageLog | undefined;

/** Every live observer, so a rect arriving for an ancestor can re-fire the targets below it. */
const liveResizeObservers = new Set<FakeResizeObserver>();

class FakeResizeObserver {
  private observed = new Set<Element>();
  constructor(private callback: ResizeObserverCallback) {
    liveResizeObservers.add(this);
  }

  observe(target: Element) {
    this.observed.add(target);
    this.fire(target);
  }

  /** Re-reports every observed target at or under `ancestor`; used when `ancestor` is assigned a rect. */
  refireWithin(ancestor: Element) {
    for (const target of Array.from(this.observed)) {
      if (ancestor === target || ancestor.contains(target)) {
        this.fire(target);
      }
    }
  }

  private fire(target: Element) {
    // The nearest explicit rect up the ancestor chain, like `layout_shim.ts`'s offsetWidth
    // and friends. With none, a browser would report an un-laid-out element as 0x0; a
    // fabricated default is what previously stretched every chart from 600x300 into its
    // panel box. Don't call back at all: a 0x0 report makes charts/grids render nothing,
    // and the rect assignment re-fires the observer once the real size is known.
    const rect = findExplicitRect(target);
    if (!rect) {
      activeUsageLog?.record('ResizeObserver.noRect', target.tagName.toLowerCase());
      return;
    }
    const { width, height } = rect;
    // Real `ResizeObserverEntry`s also carry `borderBoxSize`/`contentBoxSize`/
    // `devicePixelContentBoxSize` arrays (each `{ inlineSize, blockSize }`); EUI's own resize
    // observer wrapper (`kbn-ui-shared-deps-npm`'s bundled copy) reads
    // `entries[0].borderBoxSize[0]` unconditionally, which throws on an entry that only has
    // `contentRect` (the older, `contentRect`-only shape this previously sent).
    const boxSize = [
      { inlineSize: width, blockSize: height },
    ] as unknown as ReadonlyArray<ResizeObserverSize>;
    this.callback(
      [
        {
          target,
          contentRect: { width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0 },
          borderBoxSize: boxSize,
          contentBoxSize: boxSize,
          devicePixelContentBoxSize: boxSize,
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
    liveResizeObservers.delete(this);
  }
}

/** Sets an element's reported size for `FakeResizeObserver` (and the layout shim) to read back. */
export const setExplicitSize = (element: Element, size: ExplicitSize) => {
  setExplicitRect(element, size);
};

export interface HeadlessDomEnvironment {
  window: JSDOMType['window'];
  document: Document;
  /** Flushes the queued `requestAnimationFrame` callbacks, synchronously, up to `times` passes. */
  flushAnimationFrames: (times?: number) => void;
  /** Retrieves the real skia canvas backing a mounted `<canvas>` element, if any. */
  getBackingCanvas: (el: Element) => Canvas | undefined;
  /** Every faked browser API actually invoked so far; see `shim_usage_log.ts`. */
  usageLog: ShimUsageLog;
  /**
   * The raw V8 context backing this jsdom instance (jsdom's `JSDOM#getInternalVMContext`),
   * for `navigate_and_wait.ts`'s `runDocumentScripts` to run `<script>` tags against via
   * `vm.runInContext` once this environment's shims are installed. Only meaningful when
   * `loopbackHttpClient` was supplied (`runScripts: 'outside-only'`); throws otherwise, the
   * same way jsdom itself does when scripts are fully disabled.
   */
  getInternalVMContext: () => object;
  /** The raw text of a `<link rel="stylesheet">` the page loaded, by its resolved URL; see `collect_page_css.ts`. */
  getFetchedStylesheet: (url: string) => string | undefined;
  /** Tears down globals installed on `global`/`globalThis` for this environment. */
  dispose: () => void;
}

export interface HeadlessDomEnvironmentOptions {
  /**
   * When set, enables the Phase 2 "boot a real Kibana client" mode: `fetch`/
   * `XMLHttpRequest`/tag-driven resource loading all route through this client instead of
   * being absent, and jsdom is constructed with `runScripts: 'dangerously'` and the given
   * `url` so `<script>` tags actually execute. Omit it (the default) for the Spike A/C/D
   * style usage, which never loads or executes an external script.
   */
  loopbackHttpClient?: LoopbackHttpClient;
  /** The URL jsdom reports as `document.location`/resolves relative URLs against. */
  url?: string;
  /** Third-party origins `window.fetch` may reach (default: Elastic Maps Service); see `loopback_resource_loader.ts`. */
  allowedExternalOrigins?: readonly string[];
  /** The initial document HTML; defaults to an empty page. Phase 2 passes the real fetched HTML. */
  html?: string;
}

/**
 * Installs a minimal browser in the current worker: a `jsdom` DOM, a skia 2D canvas context
 * from `@napi-rs/canvas`, a `ResizeObserver` fed by explicit sizes, a manually-flushed
 * `requestAnimationFrame` queue, and the `jsdom_selector_compat` shim so
 * `querySelector`/`querySelectorAll`/`matches`/`closest` and jsdom's own internal base-URL
 * resolution work under Kibana's packaged `--disallow-code-generation-from-strings` flag
 * (both are nwsapi-backed natively, and nwsapi always compiles its matcher with `new
 * Function(...)`). Chart libraries that read `getComputedStyle` still get back only inline
 * styles (`element.style`), never a value computed by jsdom's native stylesheet-rule
 * matcher -- that's a separate, deliberate simplification (Elastic Charts never reads a
 * stylesheet value), not a workaround for the flag; it would not be safe for a renderer
 * that depends on CSS cascade (see the package README's coverage matrix).
 *
 * Call this once per worker thread, not once per render: the DOM and its globals are shared
 * by every render that thread handles.
 */
export const createHeadlessDomEnvironment = (
  options: HeadlessDomEnvironmentOptions = {}
): HeadlessDomEnvironment => {
  registerKibanaFonts();

  const usageLog = new ShimUsageLog();
  activeUsageLog = usageLog;
  // A rect assigned to an ancestor (see `panel_rect_assigner.ts`) re-reports the sizes of the
  // already-observed elements beneath it: components observe their size once on mount, before
  // the host knows what size to give their panel.
  const unsubscribeRectChange = onExplicitRectChange((element) => {
    for (const observer of Array.from(liveResizeObservers)) observer.refireWithin(element);
  });
  const { loopbackHttpClient } = options;
  const html = options.html ?? '<!doctype html><html><body></body></html>';

  // `runScripts: 'outside-only'`, not `'dangerously'`, when navigating: jsdom executes a
  // document's inline `<script>` tags *synchronously during construction*, in document
  // order, before this function returns -- confirmed directly (`new JSDOM(htmlWithInlineScript,
  // { runScripts: 'dangerously' })` already has the script's side effect visible the instant
  // the constructor returns). That means every shim below (selector engine, layout,
  // matchMedia, loopback fetch/XHR) would not yet be installed for a real page's very first
  // script. `'outside-only'` parses the DOM without auto-executing anything, so shims can be
  // installed first; `navigate_and_wait.ts`'s `runDocumentScripts` then executes each
  // `<script>` in document order afterward, including fetching external `src` ones through
  // the same `LoopbackResourceLoader`, replicating normal parser-blocking script order under
  // our control instead of jsdom's.
  const resourceLoader = loopbackHttpClient
    ? new LoopbackResourceLoader(loopbackHttpClient, usageLog)
    : undefined;
  // See `collect_page_css.ts`: records raw rule text as Emotion inserts it, before jsdom's
  // `cssom` has a chance to drop what it can't parse.
  installStyleSheetRecorder();
  const dom = new JSDOM(
    html,
    loopbackHttpClient
      ? {
          url: options.url ?? loopbackHttpClient.resolveUrl('/'),
          pretendToBeVisual: true,
          runScripts: 'outside-only',
          resources: resourceLoader,
        }
      : { pretendToBeVisual: true }
  );
  const { window } = dom;

  // See `jsdom_selector_compat.ts`: makes querySelector/querySelectorAll/matches/closest
  // safe under Kibana's packaged `--disallow-code-generation-from-strings` flag.
  installSelectorEngine(window as unknown as { Document: unknown; Element: unknown });

  installLayoutShim(window as unknown as { HTMLElement: { prototype: HTMLElement } }, usageLog);
  installMatchMediaShim(window as unknown as { matchMedia?: unknown }, usageLog);
  installIntersectionObserverShim(
    window as unknown as { IntersectionObserver?: unknown },
    usageLog
  );
  installScrollShim(window as unknown as { scrollTo?: unknown; scroll?: unknown }, usageLog);
  installPerformanceMarkShim(
    window as unknown as { performance?: Record<string, unknown> },
    usageLog
  );
  // `document.queryCommandSupported` (the legacy `execCommand` clipboard-feature-detection
  // API) has no jsdom implementation; Monaco's clipboard integration (bundled in
  // `kbn-ui-shared-deps-src`) calls it unconditionally at load time. A report render has no
  // real clipboard to query, so this conservatively always reports "not supported".
  (window.document as unknown as { queryCommandSupported?: () => boolean }).queryCommandSupported =
    () => false;
  if (loopbackHttpClient) {
    installLoopbackFetch(
      window as unknown as { fetch?: unknown },
      loopbackHttpClient,
      usageLog,
      options.allowedExternalOrigins
    );
    installImageLoaderShim(window as unknown as Parameters<typeof installImageLoaderShim>[0], {
      usageLog,
      fetchBytes: async (url) => {
        const response = await (window as unknown as { fetch: typeof fetch }).fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
      },
    });
    installLoopbackXhr(
      window as unknown as { XMLHttpRequest?: unknown },
      loopbackHttpClient,
      usageLog
    );
  }

  const backingCanvases = new WeakMap<HTMLCanvasElement, Canvas>();

  // A real cascade-backed `getComputedStyle` (see `computed_style.ts`); inline styles alone
  // left EUI's line-count row heights `NaN`.
  const realGetComputedStyle = createComputedStyleProvider({
    window: window as unknown as Parameters<typeof createComputedStyleProvider>[0]['window'],
    getFetchedStylesheet: (url) => resourceLoader?.stylesheets.get(url),
  });

  window.ResizeObserver = FakeResizeObserver as unknown as typeof window.ResizeObserver;
  // Unlike the chart-rendering spikes (plain `require`/`import`ed code running in this
  // same Node realm, for which the `globals` loop below assigning onto the outer
  // `globalThis` is enough), `navigate_and_wait.ts` executes real fetched bundle code via
  // `vm.runInContext(code, dom.getInternalVMContext())` -- a *different* V8 context whose
  // global object is `window` itself. Anything a navigated bundle needs as a bare global
  // (not accessed via `window.`) must be set directly on `window`, not just `globalThis`.
  (window as unknown as { EventSource: typeof NoopEventSource }).EventSource = NoopEventSource;
  (window as unknown as { Worker: typeof NoopWorker }).Worker = NoopWorker;
  // `TextEncoder`/`TextDecoder` are real Node globals but, like the rest of this block,
  // aren't present on jsdom's own `window` -- the realm a navigated bundle's code actually
  // runs in via `vm.runInContext`.
  (
    window as unknown as { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }
  ).TextEncoder = TextEncoder;
  (
    window as unknown as { TextEncoder: typeof TextEncoder; TextDecoder: typeof TextDecoder }
  ).TextDecoder = TextDecoder;
  // Same realm-separation reasoning as `TextEncoder`/`TextDecoder` above: `ReadableStream`/
  // `WritableStream`/`TransformStream` are real Node globals (`node:stream/web`, global since
  // Node 18) but absent from jsdom's `window`. `@kbn/i18n`'s translation loader
  // (`__kbnPluginsLoaded`'s `KbnI18n.i18n.load`) uses the Streams API when fetching
  // translations, so without this the whole batched-plugin-load promise rejects before
  // `__kbnBootstrap__()` is ever called, leaving the bootstrap "Loading Elastic" screen
  // showing forever with no window `error` event (the rejection is caught and merely
  // console.error'd by rspack's own loader, not rethrown).
  (
    window as unknown as {
      ReadableStream: typeof ReadableStream;
      WritableStream: typeof WritableStream;
      TransformStream: typeof TransformStream;
    }
  ).ReadableStream = ReadableStream;
  (
    window as unknown as {
      ReadableStream: typeof ReadableStream;
      WritableStream: typeof WritableStream;
      TransformStream: typeof TransformStream;
    }
  ).WritableStream = WritableStream;
  (
    window as unknown as {
      ReadableStream: typeof ReadableStream;
      WritableStream: typeof WritableStream;
      TransformStream: typeof TransformStream;
    }
  ).TransformStream = TransformStream;
  (
    window as unknown as { PerformanceObserver: typeof NoopPerformanceObserver }
  ).PerformanceObserver = NoopPerformanceObserver;
  (window as unknown as { BroadcastChannel: typeof NoopBroadcastChannel }).BroadcastChannel =
    NoopBroadcastChannel;
  // `Request`/`Response`/`Headers` are real Node globals (`undici`, global since Node 18) but
  // absent from jsdom's `window` for the same realm-separation reason as the globals above.
  // `@kbn/core`'s HTTP fetch interceptor (`shared-core.js`'s `Fetch.createRequest`) constructs
  // a `Request` directly (`new Request('/api/core/capabilities', ...)`) rather than only
  // calling the ambient `fetch` function. Unlike a real browser's `Request`, Node's requires
  // an absolute URL and throws on a path-only string, so relative URLs must be resolved
  // against the page's own URL first, exactly as `window.fetch`/`<a href>`/etc. already do.
  // A plain constructor function, not a `class extends Request` (see the `NoopEventSource`
  // doc comment above on avoiding additional `class`es in this file): returning an object
  // from a constructor function makes `new WindowRequest(...)` yield that object instead of
  // `this`, so this behaves exactly like a subclass under `new Request(...)`.
  function WindowRequest(this: unknown, input: string | Request | URL, init?: RequestInit) {
    const resolvedInput =
      typeof input === 'string' ? new URL(input, window.location.href).toString() : input;
    // `init.signal`, if present, is a vm-context-intrinsic `AbortSignal` (e.g. `data`'s
    // `SearchInterceptor` passing `new window.AbortController().signal` into `@kbn/core`'s
    // `Fetch.createRequest`) -- a *different* class from `NativeRequest`'s own realm, which
    // its constructor validates `signal` against strictly, throwing `TypeError: RequestInit:
    // Expected signal ("AbortSignal {}") to be an instance of AbortSignal` (confirmed live).
    // Making `window.AbortController`/`AbortSignal` the host realm's classes instead (the
    // same fix as `Request`/`Response`/`Headers` above) was tried and reverted: it only moves
    // the mismatch, since jsdom's *own* internal `EventTarget.addEventListener(type, cb,
    // { signal })` webidl conversion then rejects a host-realm `AbortSignal` the same way, in
    // the opposite direction (confirmed live: `TypeError: Failed to execute
    // 'addEventListener' ... member 'signal' that is not of type 'AbortSignal'` from jsdom's
    // own `AbortSignal.js` webidl converter). Dropping `signal` here instead means this
    // one-shot render's underlying HTTP request simply isn't abortable at the network layer
    // if the issuing code later calls `controller.abort()` (e.g. `data`'s search-timeout);
    // acceptable for a render that runs once to completion with no interactive cancellation,
    // and the caller-side abort logic (ignoring/discarding whatever the search returns) still
    // behaves the same from this request's perspective either way.
    const { signal: _signal, ...initWithoutSignal } = init ?? {};
    return new NativeRequest(resolvedInput as string | Request, initWithoutSignal);
  }
  (window as unknown as { Request: typeof Request }).Request =
    WindowRequest as unknown as typeof Request;
  (window as unknown as { Response: typeof Response }).Response = Response;
  (window as unknown as { Headers: typeof Headers }).Headers = Headers;

  let rafQueue: FrameRequestCallback[] = [];
  const requestAnimationFrame: typeof window.requestAnimationFrame = (cb) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  window.requestAnimationFrame = requestAnimationFrame;
  window.cancelAnimationFrame = () => {};

  const flushAnimationFrames = (times = 50) => {
    for (let i = 0; i < times && rafQueue.length > 0; i++) {
      const queue = rafQueue;
      rafQueue = [];
      queue.forEach((cb) => cb(window.performance.now()));
    }
  };

  // Same realm-separation reasoning as `EventSource`/`Worker`/etc. above: jsdom's `window`
  // (the actual global object of `vm.runInContext(code, dom.getInternalVMContext())`) has no
  // `Path2D`/`ImageData`/`DOMMatrix`/`DOMPoint`/`DOMRect` of its own (confirmed -- jsdom does
  // not implement the Canvas/geometry APIs at all), so a navigated bundle's bare reference to
  // any of them throws `ReferenceError: <Name> is not defined` deep inside whatever chart
  // code calls it (e.g. Elastic Charts' icon/annotation-marker drawing uses `new Path2D(...)`),
  // an unhandled rejection that silently leaves that panel's `renderComplete` never firing
  // rather than surfacing as an error at the call site (confirmed live: the dashboard's
  // annotation-layer, Vega, and legacy-visualization panels hung at `data-render-complete=
  // "false"` until the render's overall timeout, with this `ReferenceError` only visible via
  // the `unhandledRejection` entries in `ShimUsageLog`). The `globals` array below only
  // exposes these as *bare* globals for the host-realm-`require`d chart-rendering spikes (see
  // its own comment); a navigated bundle needs them directly on `window` too.
  (window as unknown as { Path2D: typeof Path2D }).Path2D = Path2D;
  (window as unknown as { ImageData: typeof ImageData }).ImageData = ImageData;
  (window as unknown as { DOMMatrix: typeof DOMMatrix }).DOMMatrix = DOMMatrix;
  (window as unknown as { DOMPoint: typeof DOMPoint }).DOMPoint = DOMPoint;
  (window as unknown as { DOMRect: typeof DOMRect }).DOMRect = DOMRect;

  // jsdom's own `window.URL` has no `createObjectURL`/`revokeObjectURL` (confirmed -- jsdom
  // does not implement the Object URL registry at all), which MapLibre GL JS (used by both
  // the `map` embeddable and legacy region-map/tile-map visualizations' raster tile layer)
  // calls unconditionally when decoding a fetched tile image: `img.src =
  // URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))`. Left unshimmed this
  // throws synchronously (`TypeError: URL.createObjectURL is not a function`), which that
  // caller surfaces as a visible "Unable to initialize map" panel error rather than a hang
  // (confirmed live). Node's own global `URL`/`Blob` (distinct from jsdom's) already
  // implement a working Object URL registry *and* can resolve `blob:` URLs back to bytes via
  // Node's global `fetch` -- so rather than reimplement that registry, `window.Blob` is
  // replaced with Node's native `Blob` (so the instances handed to `createObjectURL` satisfy
  // its internal `instanceof Blob` check) and `window.URL.createObjectURL`/
  // `revokeObjectURL` delegate to Node's `URL`. The resulting `blob:` URLs are then resolved
  // by `LoopbackResourceLoader.fetch`'s passthrough for `blob:` URLs (see that file).
  (window as unknown as { Blob: typeof Blob }).Blob = Blob;
  (
    window.URL as unknown as {
      createObjectURL: typeof URL.createObjectURL;
      revokeObjectURL: typeof URL.revokeObjectURL;
    }
  ).createObjectURL = URL.createObjectURL;
  (
    window.URL as unknown as {
      createObjectURL: typeof URL.createObjectURL;
      revokeObjectURL: typeof URL.revokeObjectURL;
    }
  ).revokeObjectURL = URL.revokeObjectURL;

  // A browser resets a canvas's bitmap whenever its `width`/`height` change (property
  // assignment *or* `setAttribute`, which is how React sets the `width={w * dpr}` prop
  // Elastic Charts passes every render). The skia backing is created lazily at the first
  // `getContext`, so it must follow later changes or it stays at its first size forever --
  // which is what turned every Vega panel (`canvas(1, 1)`, `getContext`, then
  // `canvas.width = w * ratio`) into a 1x1 image.
  const syncBackingSize = (el: HTMLCanvasElement) => {
    const backing = backingCanvases.get(el);
    if (!backing) return;
    const width = Math.max(1, el.width);
    const height = Math.max(1, el.height);
    if (backing.width !== width) backing.width = width;
    if (backing.height !== height) backing.height = height;
  };
  const canvasProto = window.HTMLCanvasElement.prototype;
  for (const dimension of ['width', 'height'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(canvasProto, dimension);
    if (descriptor?.set) {
      Object.defineProperty(canvasProto, dimension, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(this: HTMLCanvasElement, value: number) {
          descriptor.set!.call(this, value);
          syncBackingSize(this);
        },
      });
    }
  }
  const originalSetAttribute = canvasProto.setAttribute;
  canvasProto.setAttribute = function (this: HTMLCanvasElement, name: string, value: string) {
    originalSetAttribute.call(this, name, value);
    if (name === 'width' || name === 'height') syncBackingSize(this);
  };

  // A skia context's `drawImage` can't take a jsdom `<img>`/`<canvas>` element; unwrap them.
  const wrapped2d = new WeakMap<object, unknown>();
  const getWrapped2dContext = (backing: Canvas) => {
    const raw = backing.getContext('2d') as unknown as Record<string, unknown>;
    let proxy = wrapped2d.get(raw);
    if (!proxy) {
      proxy = new Proxy(raw, {
        get: (target, prop) => {
          const value = (target as Record<string | symbol, unknown>)[prop];
          if (prop === 'drawImage' || prop === 'createPattern') {
            return (drawable: unknown, ...args: unknown[]) =>
              (value as (...a: unknown[]) => unknown).call(
                target,
                unwrapDrawable(drawable, (c) => backingCanvases.get(c as HTMLCanvasElement)),
                ...args
              );
          }
          return typeof value === 'function' ? value.bind(target) : value;
        },
        set: (target, prop, value) => {
          (target as Record<string | symbol, unknown>)[prop] = value;
          return true;
        },
      });
      wrapped2d.set(raw, proxy);
    }
    return proxy;
  };

  const webglStubs = new WeakMap<HTMLCanvasElement, WebGLRenderingContext>();
  canvasProto.getContext = function (this: HTMLCanvasElement, type: string, attributes?: unknown) {
    const isWebGl1 = type === 'webgl' || type === 'experimental-webgl';
    if (type !== '2d' && !isWebGl1) return null; // incl. 'webgl2': forces libraries onto the WebGL1 path
    let backing = backingCanvases.get(this);
    if (!backing) {
      backing = createCanvas(Math.max(1, this.width || 300), Math.max(1, this.height || 150));
      backingCanvases.set(this, backing);
    } else {
      syncBackingSize(this);
    }
    if (isWebGl1) {
      // Not a real GL context (see `webgl_stub.ts`); the skia backing exists so a panel's
      // canvas can still be read back (the host paints the map's native render into it).
      let stub = webglStubs.get(this);
      if (!stub) {
        stub = createWebGLStub(this, usageLog, attributes);
        webglStubs.set(this, stub);
      }
      return stub as unknown as RenderingContext;
    }
    return getWrapped2dContext(backing) as unknown as RenderingContext;
  } as typeof window.HTMLCanvasElement.prototype.getContext;

  // `@mapbox/mapbox-gl-supported` (and MapLibre) probe for these before trying a context.
  const globalWithGl = window as unknown as Record<string, unknown>;
  for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    if (!globalWithGl[name]) globalWithGl[name] = function WebGLRenderingContextStub() {};
  }

  const globals: Array<[string, unknown]> = [
    ['window', window],
    ['document', window.document],
    ['navigator', window.navigator],
    ['HTMLElement', window.HTMLElement],
    ['Node', window.Node],
    ['Element', window.Element],
    ['SVGElement', window.SVGElement],
    ['Event', window.Event],
    ['MouseEvent', window.MouseEvent],
    ['performance', window.performance],
    ['requestAnimationFrame', requestAnimationFrame],
    ['cancelAnimationFrame', window.cancelAnimationFrame],
    ['devicePixelRatio', 2],
    // Canvas-related constructors Elastic Charts expects as ambient globals, backed by the
    // native skia implementations rather than jsdom's (jsdom does not implement these).
    ['Path2D', Path2D],
    ['ImageData', ImageData],
    ['Image', Image],
    ['DOMMatrix', DOMMatrix],
    ['DOMPoint', DOMPoint],
    ['DOMRect', DOMRect],
    // See the comment on `realGetComputedStyle` above.
    ['getComputedStyle', realGetComputedStyle],
    // Elastic Charts' resizer (and plenty of other browser code) references `ResizeObserver`
    // as a bare global rather than `window.ResizeObserver`.
    ['ResizeObserver', FakeResizeObserver],
    ['EventSource', NoopEventSource],
    ['Worker', NoopWorker],
    ['PerformanceObserver', NoopPerformanceObserver],
    ['BroadcastChannel', NoopBroadcastChannel],
    ['Request', WindowRequest],
    ['Response', Response],
    ['Headers', Headers],
  ];

  const globalRecord = globalThis as unknown as Record<string, unknown>;
  const previous = new Map<string, unknown>();
  for (const [key, value] of globals) {
    previous.set(key, globalRecord[key]);
    // Recent Node versions define some of these (notably `navigator`) as a getter-only
    // global, so a plain assignment throws; redefine the property instead.
    Object.defineProperty(globalRecord, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  window.getComputedStyle = realGetComputedStyle as typeof window.getComputedStyle;

  return {
    window,
    document: window.document,
    flushAnimationFrames,
    getBackingCanvas: (el) => backingCanvases.get(el as HTMLCanvasElement),
    getFetchedStylesheet: (url) => resourceLoader?.stylesheets.get(url),
    usageLog,
    getInternalVMContext: () => dom.getInternalVMContext(),
    dispose: () => {
      unsubscribeRectChange();
      liveResizeObservers.clear();
      if (activeUsageLog === usageLog) activeUsageLog = undefined;
      for (const [key, value] of previous) {
        Object.defineProperty(globalRecord, key, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      dom.window.close();
    },
  };
};
