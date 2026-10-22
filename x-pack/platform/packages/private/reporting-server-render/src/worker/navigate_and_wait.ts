/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import vm from 'vm';
import type { HeadlessDomEnvironment } from './headless_dom_environment';
import { setScreenshotContext, setScreenshotModeEnabled } from './screenshot_context';
import { LAYOUT_SELECTORS } from './layout_selectors';
import { findPanelIndexForElement } from './panel_rect_assigner';
import type { ShimUsageLog } from './shim_usage_log';

/**
 * Builds the `<script>` tag `injectScreenshotContextScript` prepends to `<head>`. Equivalent
 * to the Chromium driver's `page.evaluateOnNewDocument(setScreenshotContext, key, value)`
 * calls, done as a literal script instead since jsdom has no `evaluateOnNewDocument` hook --
 * being the first child of `<head>`, `runDocumentScripts` (below) executes it before any of
 * the page's own scripts, which is the property that matters (not literally "before
 * construction").
 */
const buildScreenshotContextScriptTag = (context: Record<string, unknown>): string => {
  const assignments = Object.entries(context)
    .map(
      ([key, value]) => `__setScreenshotContext__(${JSON.stringify(key)}, ${jsonForScript(value)});`
    )
    .join('\n');
  return `<script data-kbn-screenshot-context-bootstrap="true">${assignments}\n__setScreenshotModeEnabled__();</script>`;
};

/**
 * Marker attribute on the screenshot-context script tag above. This script is our own
 * injected equivalent of the Chromium driver's `page.evaluateOnNewDocument` hook (see the
 * doc comment on `injectScreenshotContextScript`), not a script authored by the navigated
 * page itself -- a real browser's CSP never applies to it (CDP-injected scripts run outside
 * the page's own script execution, before CSP would see them), so it must be exempt from the
 * un-nonced-inline-script skip that `runOneScript` otherwise applies under a strict CSP.
 */
const SCREENSHOT_CONTEXT_BOOTSTRAP_ATTR = 'data-kbn-screenshot-context-bootstrap';

// `JSON.stringify` alone would let a value containing `</script>` end the tag early.
const jsonForScript = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * Inserts the screenshot-context script as the first child of `<head>` (creating `<head>` if
 * the document doesn't have one) so it runs before every other script on the page.
 */
export const injectScreenshotContextScript = (
  html: string,
  context: Record<string, unknown>
): string => {
  const scriptTag = buildScreenshotContextScriptTag(context);
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${scriptTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${scriptTag}</head>`);
  }
  return `${scriptTag}${html}`;
};

/**
 * Installs `__setScreenshotContext__`/`__setScreenshotModeEnabled__` as window globals the
 * injected script tag above calls, bound to this environment's window -- kept out of the
 * screenshot-context script's own text so that text stays pure data (`JSON.stringify`
 * output), not a second copy of `setScreenshotContext`'s logic inlined as a string.
 */
export const installScreenshotContextBridge = (env: HeadlessDomEnvironment): void => {
  const globalRecord = env.window as unknown as Record<string, unknown>;
  globalRecord.__setScreenshotContext__ = (key: string, value: unknown) =>
    setScreenshotContext(env.window, key, value);
  globalRecord.__setScreenshotModeEnabled__ = () => setScreenshotModeEnabled(env.window);
};

/** Tracks scripts already executed so the initial sweep and the dynamic-insertion watcher never run the same element twice. */
const handledScripts = new WeakSet<Element>();

/**
 * Reads Kibana's own `<kbn-csp data="{...}">` marker (injected by
 * `src/core/packages/http/server-internal`'s bootstrap renderer) to tell whether the page
 * declares a strict CSP. Real browsers that enforce `script-src` without `'unsafe-inline'`
 * or a matching `nonce` never execute an un-nonced inline `<script>`; jsdom has no CSP
 * enforcement at all, so without this check every page's un-nonced "CSP canary" script
 * (`window.__kbnCspNotEnforced__ = true;`, see `bootstrap.js`) would incorrectly run and
 * trip Kibana's own legacy-browser error screen instead of loading the app.
 */
const isStrictCspDeclared = (document: Document): boolean => {
  const marker = document.querySelector('kbn-csp');
  const raw = marker?.getAttribute('data');
  if (!raw) return false;
  try {
    return Boolean((JSON.parse(raw) as { strictCsp?: boolean }).strictCsp);
  } catch {
    return false;
  }
};

const runOneScript = async (
  env: HeadlessDomEnvironment,
  usageLog: ShimUsageLog,
  script: Element,
  label: string
): Promise<void> => {
  if (handledScripts.has(script)) return;
  handledScripts.add(script);

  const type = script.getAttribute('type');
  if (type && type !== 'text/javascript' && type !== 'application/javascript') {
    usageLog.record('runDocumentScripts.skippedModuleOrUnknownType', type);
    return;
  }

  const EventCtor = (env.window as unknown as { Event: typeof Event }).Event;
  const context = env.getInternalVMContext();
  const src = script.getAttribute('src');

  if (
    !src &&
    !script.getAttribute('nonce') &&
    !script.hasAttribute(SCREENSHOT_CONTEXT_BOOTSTRAP_ATTR) &&
    isStrictCspDeclared(env.document)
  ) {
    // Mirrors real CSP enforcement for an un-nonced inline script on a strict-CSP page --
    // see `isStrictCspDeclared`'s doc comment.
    usageLog.record('runDocumentScripts.skippedUnnoncedInlineScriptUnderStrictCsp', label);
    return;
  }

  let code: string;
  let filename: string;
  if (src) {
    const url = new URL(src, env.window.location.href).toString();
    usageLog.record('runDocumentScripts.externalScript', url);
    let response: Response;
    try {
      response = await (env.window as unknown as { fetch: typeof fetch }).fetch(url);
    } catch (error) {
      // Real failure to fetch (network/CORS): this is the one case a real browser reports
      // via the script element's own `error` event, which `bootstrap.js`'s chunk loader
      // (`dom.addEventListener('error', failure)`) relies on to show its reload screen.
      script.dispatchEvent(new EventCtor('error'));
      throw error;
    }
    if (!response.ok) {
      script.dispatchEvent(new EventCtor('error'));
      throw new Error(`Failed to fetch script ${url}: ${response.status}`);
    }
    code = await response.text();
    filename = url;
  } else {
    code = script.textContent ?? '';
    filename = `${env.window.location.href}#${label}`;
  }

  // rspack's runtime (`auto_public_path`) reads `document.currentScript.tagName`/`.src`.
  Object.defineProperty(env.document, 'currentScript', {
    value: script,
    configurable: true,
  });
  try {
    vm.runInContext(code, context, { filename });
  } catch (error) {
    // Per spec, a script that successfully loaded but threw while executing still fires
    // `load` (not `error`) on its element -- only the fetch itself failing is an `error`.
    // Report the exception the way an uncaught top-level script error reaches a page (a
    // `window` `error` event) instead of silently swallowing it or wrongly blocking
    // `bootstrap.js`'s own chunk-loading chain on it.
    env.window.dispatchEvent(
      Object.assign(new EventCtor('error'), { message: String(error), error })
    );
    usageLog.record('runDocumentScripts.scriptExecutionError', `${filename}: ${error}`);
  } finally {
    Object.defineProperty(env.document, 'currentScript', {
      value: null,
      configurable: true,
    });
  }
  script.dispatchEvent(new EventCtor('load'));
};

/**
 * Runs every `<script>` present in `env.document` *at call time*, in document order, the way
 * a browser's parser would: inline scripts run their `textContent`; `src` scripts are
 * fetched (through the environment's own loopback resource loading, so the same forwarded
 * headers apply) and run before moving to the next script. Needed because
 * `createHeadlessDomEnvironment` uses `runScripts: 'outside-only'` when navigating (see that
 * file's comment on why), which parses but never auto-executes scripts.
 *
 * Only covers scripts that exist in the document already. A real Kibana page's own
 * `bootstrap.js` entry appends further `<script>` tags at runtime (rspack's chunk loader) --
 * call `installDynamicScriptRunner` *before* this to also execute those as they're inserted,
 * the way a browser would.
 *
 * Does not implement `type="module"` (skipped, with a usage-log entry) or `async`/`defer`
 * ordering semantics -- Kibana's own bundles are plain, synchronous, non-module scripts, so
 * document order is the correct order for them; a page that relies on `defer` reordering or
 * ES module scripts would render in the wrong order here.
 */
export const runDocumentScripts = async (
  env: HeadlessDomEnvironment,
  usageLog: ShimUsageLog
): Promise<void> => {
  const scripts = Array.from(env.document.getElementsByTagName('script'));
  for (let i = 0; i < scripts.length; i++) {
    await runOneScript(env, usageLog, scripts[i], `inline-script-${i}`);
  }
};

/**
 * Watches `env.document` for `<script>` elements inserted after the initial parse -- the
 * case a real Kibana page hits immediately, since `bootstrap.js` is itself just rspack's
 * chunk loader, which injects further `<script src>` tags to fetch and run the real
 * application bundles. A real browser executes a script the instant it's inserted into the
 * document (for a non-`async`/non-`defer`, non-module script -- the only kind Kibana's
 * bundles use); this replicates that by executing each newly observed `<script>` as soon as
 * it is inserted into the document, in insertion order (serialized through a promise chain
 * so two scripts inserted back-to-back still run in order, not concurrently).
 *
 * Must be installed before `runDocumentScripts` so scripts the bootstrap script injects
 * *while* `runDocumentScripts` is still executing earlier scripts are not missed.
 *
 * Returns a disposer that disconnects the observer; callers should keep the observer running
 * until `waitForRenderComplete` resolves, since later lifecycle code (route changes, lazy
 * panel loading) can keep inserting scripts.
 */
export const installDynamicScriptRunner = (
  env: HeadlessDomEnvironment,
  usageLog: ShimUsageLog
): { dispose: () => void; firstError: Promise<void> } => {
  let chain: Promise<void> = Promise.resolve();
  let rejected: ((error: unknown) => void) | undefined;
  const firstError = new Promise<void>((_resolve, reject) => {
    rejected = reject;
  });

  const handleNode = (node: Node, index: number) => {
    if (
      node.nodeType === 1 /* ELEMENT_NODE */ &&
      (node as Element).tagName === 'SCRIPT' &&
      !handledScripts.has(node as Element)
    ) {
      const script = node as Element;
      chain = chain
        .then(() => runOneScript(env, usageLog, script, `dynamic-script-${index}`))
        .catch((error) => {
          usageLog.record('installDynamicScriptRunner.scriptError', String(error));
          rejected?.(error);
        });
    }
  };

  let dynamicIndex = 0;
  const observer = new (
    env.window as unknown as { MutationObserver: typeof MutationObserver }
  ).MutationObserver((mutations) => {
    usageLog.record('installDynamicScriptRunner.mutationBatch', String(mutations.length));
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => handleNode(node, dynamicIndex++));
    }
  });
  observer.observe(env.document.documentElement ?? env.document, {
    childList: true,
    subtree: true,
  });

  return {
    dispose: () => observer.disconnect(),
    firstError,
  };
};

export interface RenderCompleteResult {
  renderErrors: string[];
  /** Set when `onTimeout: 'return'` ended the wait with panels still rendering: which ones. */
  timedOut?: string;
}

/**
 * A panel that holds a MapLibre map reports `data-render-complete` only once its map has
 * loaded every tile, and no tile ever loads here (pixels come from MapLibre Native), so it is
 * waited on by `waitForMapPanelsSettled` instead of by its own flag.
 */
const hasMapLibreMap = (el: Element) => el.getElementsByClassName('maplibregl-map').length > 0;

/** Matches `wait_for_render.ts`'s own condition exactly: an element only counts as still rendering when its attribute is the literal string `'false'` (not merely falsy/absent). */
const isStillRendering = (el: Element) => el.getAttribute('data-render-complete') === 'false';

/**
 * Polls (real `setTimeout`, not the faked `requestAnimationFrame` queue -- rendering happens
 * asynchronously off real timers/promises once scripts start running) for the same two
 * conditions the Chromium pipeline's `waitForVisualizations`/`wait_for_render.ts` wait for:
 * `data-shared-items-count` reaching the number of `[data-shared-item]` elements in the DOM,
 * *and* every one of those elements' own `data-render-complete` attribute no longer being
 * the literal string `'false'`.
 *
 * Phase 4's Tier 5 verification found that counting elements alone (this function's
 * pre-Phase-4 condition) is a false positive for any embeddable that mounts its wrapper
 * `[data-shared-item]` element synchronously but renders its content asynchronously (e.g.
 * Lens's `lnsDatatable`, whose expression pipeline resolves well after the wrapper DOM node
 * appears) -- `renderComplete` fired on an element whose content, per
 * `EmbeddablePanelImpl`/`presentation-panel`'s own convention
 * (`data-render-complete="false"` until the panel's `onRender` callback actually fires),
 * was never written. `lnsXY` (Tier 1-4's only proof dashboard) happened not to expose this
 * gap because its canvas draws fast enough to already be `'true'` by the time this function
 * next polled.
 *
 * Also collects `[data-render-error]` text content, matching what the Chromium path
 * surfaces as job warnings.
 */
export const waitForRenderComplete = async (
  document: Document,
  {
    timeoutMs = 60_000,
    pollIntervalMs = 100,
    selectors = LAYOUT_SELECTORS,
    ignorePanelIds = new Set<string>(),
    flushAnimationFrames,
    onTimeout = 'throw',
  }: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    selectors?: typeof LAYOUT_SELECTORS;
    /**
     * `panelIndex`es (the dashboard grid item's `panel-${panelIndex}` DOM id) to exclude from the
     * `data-render-complete !== 'false'` gate. Phase 6 uses this for `'map'` panels: the
     * real `maplibre-gl` JS bundle gets a `null` WebGL context in this jsdom environment
     * (see `render_map_panel.ts`'s doc comment) and may never flip its own
     * `data-render-complete` to `'true'`, which would otherwise block every *other* panel's
     * wait until `timeoutMs` for a panel this package renders through an entirely separate,
     * already-complete path (`renderMapPanel`).
     */
    ignorePanelIds?: Set<string>;
    /**
     * `HeadlessDomEnvironment.flushAnimationFrames`, if provided -- called once per poll.
     * `window.requestAnimationFrame` is faked as a plain queue (see
     * `headless_dom_environment.ts`) with nothing else in this environment driving a real
     * animation-frame loop; Elastic Charts schedules its own draw -- and the `onRenderChange`
     * callback that fires `Panel:<type>:renderComplete` -- inside a `requestAnimationFrame`
     * callback, so without flushing that queue here, any xy/metric (non-Lens-datatable) chart
     * panel reaches `Panel:<type>:renderStart` and then hangs forever, never reaching
     * `data-render-complete="true"` (confirmed live: `xyVis`/`metricVis` panels stuck at
     * `renderStart` per `ShimUsageLog`, while `lens_datatable_renderer`, which doesn't depend
     * on a RAF-deferred draw, completed normally). `render_elastic_charts_to_png.ts`'s
     * standalone Spike A path already does its own explicit flush for the same reason; this
     * is the equivalent for the generic navigated-dashboard path.
     */
    flushAnimationFrames?: (times?: number) => void;
    /**
     * What a timeout does: `'throw'` (default, the Chromium pipeline's behaviour) fails the
     * wait; `'return'` returns what is there with `timedOut` set, so one panel that never
     * completes (a Vega map view, whose basemap needs WebGL tiles that never arrive here)
     * degrades that panel instead of failing the whole report.
     */
    onTimeout?: 'throw' | 'return';
  } = {}
): Promise<RenderCompleteResult> => {
  const deadline = Date.now() + timeoutMs;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    flushAnimationFrames?.();
    const container = document.querySelector(selectors.screenshot);
    const expectedCountAttr = container?.getAttribute(selectors.itemsCountAttribute);
    const expectedCount = expectedCountAttr ? parseInt(expectedCountAttr, 10) : undefined;
    const items = Array.from(document.querySelectorAll(selectors.renderComplete));
    const isIgnored = (el: Element) => {
      const panelIndex = findPanelIndexForElement(el);
      return (panelIndex !== undefined && ignorePanelIds.has(panelIndex)) || hasMapLibreMap(el);
    };
    const stillRendering = items.filter((el) => !isIgnored(el) && isStillRendering(el)).length;

    if (expectedCount !== undefined && items.length >= expectedCount && stillRendering === 0) {
      // Errors inside panels rendered out-of-band (maps) are theirs to report, not the page's.
      const renderErrors = Array.from(document.querySelectorAll(selectors.renderError))
        .filter((el) => !isIgnored(el))
        .map((el) => el.getAttribute(selectors.renderErrorAttribute) ?? el.textContent ?? '');
      return { renderErrors };
    }

    if (Date.now() > deadline) {
      // Identifies *which* panel(s) never completed, not just a count: an index-ordered
      // "N still rendering" alone gives a job-failure log reader nothing to act on --
      // confirmed the hard way diagnosing a stuck TSVB panel live against a dev Kibana,
      // where the title/embeddable-id were the only way to tell it apart from the other 11
      // panels that did complete.
      const stillRenderingDescriptions = items
        .map((el, index) => ({ el, index }))
        .filter(({ el }) => !isIgnored(el) && isStillRendering(el))
        .map(({ el, index }) => {
          const title =
            el.getAttribute('data-title') ??
            el.getAttribute('data-embeddable-id') ??
            el.id ??
            'untitled';
          // Diagnostic aid beyond the title alone: whether this panel ever drew *anything*
          // (a `<canvas>`, a chart's own wrapper markup) or is still showing its initial
          // loading state tells a log reader whether the panel's render pipeline started at
          // all versus started and then hung partway through -- confirmed useful live
          // distinguishing "never fetched" panels from "fetched but never finished drawing"
          // ones, which otherwise look identical from the title alone.
          const hasCanvas = el.querySelector('canvas') !== null;
          return `#${index} (${title}, innerHTML: ${el.innerHTML.length} chars, canvas: ${hasCanvas})`;
        })
        .join(', ');
      const message =
        `Timed out after ${timeoutMs}ms waiting for ${expectedCount ?? '?'} rendered ` +
        `element(s) with no pending data-render-complete="false"; found ${items.length} ` +
        `element(s), ${stillRendering} still rendering: ${stillRenderingDescriptions}.`;
      if (onTimeout === 'return') return { renderErrors: [], timedOut: message };
      throw new Error(message);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
};

/**
 * A cheap fingerprint of what each panel has drawn so far: data-grid cells, canvases, and
 * text length. Unchanged across an idle window means the panel stopped producing output.
 */
const panelSignature = (document: Document): string =>
  Array.from(document.getElementsByTagName('*'))
    .filter((el) => el.hasAttribute('data-shared-item'))
    .map(
      (el) =>
        `${el.getElementsByClassName('euiDataGridRowCell').length}:` +
        `${el.getElementsByTagName('canvas').length}:${(el.textContent ?? '').length}`
    )
    .join('|');

/**
 * Waits for the page to go quiet after `waitForRenderComplete`: no DOM mutations for
 * `idleMs`, every panel's output fingerprint unchanged over that window, and no panel back
 * at `data-render-complete="false"`. `renderComplete` alone is not final in this
 * environment: panels sized after mount re-render (see `panel_rect_assigner.ts`), Lens's
 * datatable fires on a fixed 300ms timer, and Discover/markdown/links report complete
 * before any content exists. Bounded by `maxMs` and never throws -- a panel that animates
 * or polls forever should still be captured, with a usage-log entry saying so.
 */
export const waitForQuiescence = async (
  env: Pick<HeadlessDomEnvironment, 'window' | 'document' | 'flushAnimationFrames' | 'usageLog'>,
  {
    idleMs = 300,
    maxMs = 5000,
    pollIntervalMs = 50,
    selectors = LAYOUT_SELECTORS,
    ignorePanelIds = new Set<string>(),
  }: {
    idleMs?: number;
    maxMs?: number;
    pollIntervalMs?: number;
    selectors?: typeof LAYOUT_SELECTORS;
    /** Same meaning as `waitForRenderComplete`'s: panels rendered out-of-band (maps). */
    ignorePanelIds?: Set<string>;
  } = {}
): Promise<void> => {
  const { document } = env;
  let lastChangeAt = Date.now();
  const observer = new (
    env.window as unknown as { MutationObserver: typeof MutationObserver }
  ).MutationObserver(() => {
    lastChangeAt = Date.now();
  });
  observer.observe(document.documentElement ?? document, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
  });

  const deadline = Date.now() + maxMs;
  let signature = panelSignature(document);
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      env.flushAnimationFrames();
      const current = panelSignature(document);
      if (current !== signature) {
        signature = current;
        lastChangeAt = Date.now();
      }
      const rendering = Array.from(document.querySelectorAll(selectors.renderComplete)).some(
        (el) => {
          const panelIndex = findPanelIndexForElement(el);
          return (
            !(panelIndex !== undefined && ignorePanelIds.has(panelIndex)) &&
            !hasMapLibreMap(el) &&
            isStillRendering(el)
          );
        }
      );
      if (rendering) {
        lastChangeAt = Date.now();
      }
      if (Date.now() - lastChangeAt >= idleMs) return;
      if (Date.now() > deadline) {
        env.usageLog.record('quiescence.timeout', `${maxMs}ms`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  } finally {
    observer.disconnect();
  }
};

/**
 * Waits for every `EuiDataGrid` on the page to have rendered at least one body row (or to
 * legitimately be empty: `aria-rowcount` of 1 is just the header). The grid virtualizes on
 * its measured size, so its rows appear a render after `renderComplete`. Bounded by
 * `timeoutMs`; never throws.
 */
export const waitForGridRows = async (
  env: Pick<HeadlessDomEnvironment, 'document' | 'flushAnimationFrames' | 'usageLog'>,
  { timeoutMs = 3000, pollIntervalMs = 50 }: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  const grids = () => Array.from(env.document.getElementsByClassName('euiDataGrid'));
  const isReady = (grid: Element) => {
    if (grid.getElementsByClassName('euiDataGridRowCell').length > 0) return true;
    const content = grid.getElementsByClassName('euiDataGrid__content')[0];
    const rowCount = parseInt(content?.getAttribute('aria-rowcount') ?? '', 10);
    return Number.isFinite(rowCount) && rowCount <= 1;
  };
  // eslint-disable-next-line no-constant-condition
  while (true) {
    env.flushAnimationFrames();
    if (grids().every(isReady)) return;
    if (Date.now() > deadline) {
      env.usageLog.record(
        'gridRows.timeout',
        `${grids().filter((g) => !isReady(g)).length} grid(s)`
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
};
