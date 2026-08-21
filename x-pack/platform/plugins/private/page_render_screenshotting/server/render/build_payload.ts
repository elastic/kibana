/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { KBN_SCREENSHOT_MODE_ENABLED_KEY } from '@kbn/screenshot-mode-plugin/common';
import type { PdfScreenshotOptions, PngScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import type { UrlOrUrlWithContext } from '@kbn/screenshotting-plugin/server/screenshots';
import type { RenderPageRequest } from './types';

// Same literal as screenshot_mode/common/context.ts — not exported as a named constant there.
const KBN_SCREENSHOT_CONTEXT_KEY = '__KBN_SCREENSHOT_CONTEXT__';

const KBN_APP_WRAPPER_SELECTOR = '.kbnAppWrapper';
const SHARED_ITEM_SELECTOR = '[data-shared-item]';
const SHARED_ITEMS_CONTAINER_SELECTOR = '[data-shared-items-container]';
const SHARED_ITEMS_COUNT_ATTRIBUTE = 'data-shared-items-count';
const RENDER_COMPLETE_ATTRIBUTE = 'data-render-complete';
const RENDER_ERROR_ATTRIBUTE = 'data-render-error';

// Matches screenshotting's DEFAULT_VIEWPORT (chromium/driver_factory/index.ts) — the same
// viewport real screenshotting would have used.
const DEFAULT_VIEWPORT = { width: 1950, height: 1200 };

// Ported from x-pack/platform/plugins/shared/screenshotting/server/layouts/preserve_layout.css —
// screenshotting skips this injection for the 'print' layout (getCssOverridesPath() returns
// undefined there), so it's only needed for the preserve_layout/viewport branch below.
const PRESERVE_LAYOUT_CSS = `
.hide-for-sharing { display: none !important; }
.stretch-for-sharing { margin: 0px; }
#globalBannerList { display: none; }
.lnsWorkspacePanelWrapper__contentFlexGroup { display: block !important; }
.lnsVisualizationWorkspace_container { padding: 0 !important; border: 0 !important; }
`.trim();

export const DEMO_BANNER = 'Rendered in MT Reporting page-render-service';

/** Serializes a value as an inert, CSP-safe init script (no eval — see page-render-service's
 * CSP writeup: `onNewDocumentScripts` are run via CDP's addScriptToEvaluateOnNewDocument, not
 * `page.evaluate(string)`, so this is safe even under Kibana's `script-src 'self'`). */
function defineGlobal(key: string, value: unknown): string {
  return `Object.defineProperty(window, ${JSON.stringify(
    key
  )}, { enumerable: true, writable: true, configurable: false, value: ${JSON.stringify(value)} });`;
}

function getRequestAuthHeaders(
  request: KibanaRequest | undefined,
  security: SecurityServiceStart
): Record<string, string> {
  if (!request) {
    return {};
  }

  const authHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  const headers: Record<string, string> = {};

  if (authHeader) {
    headers.authorization = authHeader.toString();

    if (isUiamCredential(authHeader) && security.authc.apiKeys.uiam) {
      // Spread last so a caller-supplied value can never win — same rule the interface's own
      // doc comment calls out (and the pattern workflows_execution_engine's call_kibana_api.ts
      // follows).
      Object.assign(
        headers,
        security.authc.apiKeys.uiam.getInternalCallerAttestationHeaders(authHeader)
      );
    }
  }

  const cookie = request.headers.cookie;
  if (typeof cookie === 'string') {
    headers.cookie = cookie;
  }

  return headers;
}

/** `options.urls` holds at most one entry in practice for both pdf and png dashboard exports —
 * printable_pdf_v2.ts can in principle pass more than one locator, but the redirect app and the
 * capture below only ever handle a single page per render-service call, so anything past the
 * first is dropped with a warning surfaced via `renderErrors` on the eventual result. */
function getSingleUrl(urls: UrlOrUrlWithContext[]): {
  url: string;
  context: Record<string, unknown>;
} {
  const [first] = urls;
  if (first === undefined) {
    throw new Error('getScreenshots() was called with no URLs to render');
  }
  if (typeof first === 'string') {
    return { url: first, context: {} };
  }
  const [url, context] = first;
  return { url, context: context as Record<string, unknown> };
}

/** Replaces the origin of a Reporting-built capture URL with `server.publicBaseUrl`, preserving
 * path, query and hash.
 *
 * Reporting derives the origin from `xpack.reporting.kibanaServer.*`, which defaults to
 * `server.host`/`server.port` — and a `0.0.0.0` host is silently rewritten to `localhost`. That
 * is fine for the real screenshotting plugin (Chromium runs in the Kibana pod) but a remote
 * render service resolves `localhost` to itself. Returns the URL untouched if there is no
 * `publicBaseUrl` to substitute, or if either value will not parse. */
export function withPublicOrigin(url: string, publicBaseUrl?: string): string {
  if (!publicBaseUrl) {
    return url;
  }
  try {
    const target = new URL(url);
    const { origin } = new URL(publicBaseUrl);
    return `${origin}${target.pathname}${target.search}${target.hash}`;
  } catch {
    return url;
  }
}

export function buildRenderPageRequest(
  options: PdfScreenshotOptions | PngScreenshotOptions,
  security: SecurityServiceStart,
  publicBaseUrl?: string
): { payload: RenderPageRequest; droppedUrlCount: number } {
  const { url: rawUrl, context } = getSingleUrl(options.urls ?? []);
  const url = withPublicOrigin(rawUrl, publicBaseUrl);
  const droppedUrlCount = Math.max((options.urls?.length ?? 0) - 1, 0);

  const layoutId = options.layout?.id ?? 'preserve_layout';
  const isPrint = options.format === 'pdf' && layoutId === 'print';

  const screenshotContext = { ...context, layout: layoutId };

  const authHeaders = getRequestAuthHeaders(options.request, security);
  const customHeaders = options.headers
    ? Object.fromEntries(
        Object.entries(options.headers)
          .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
          .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])
      )
    : undefined;

  const payload: RenderPageRequest = {
    url,
    pageAuth: { headers: authHeaders },
    requestHeaders: customHeaders,
    onNewDocumentScripts: [
      defineGlobal(KBN_SCREENSHOT_MODE_ENABLED_KEY, true),
      defineGlobal(KBN_SCREENSHOT_CONTEXT_KEY, screenshotContext),
    ],
    css: isPrint ? undefined : PRESERVE_LAYOUT_CSS,
    waitFor: {
      pageLoadSelector: KBN_APP_WRAPPER_SELECTOR,
      itemSelector: SHARED_ITEM_SELECTOR,
      itemsCountAttribute: SHARED_ITEMS_COUNT_ATTRIBUTE,
      renderCompleteAttribute: RENDER_COMPLETE_ATTRIBUTE,
      renderErrorAttribute: RENDER_ERROR_ATTRIBUTE,
    },
    browser: {
      viewport: DEFAULT_VIEWPORT,
      timezone: options.browserTimezone,
    },
    output: {
      format: options.format === 'png' ? 'png' : 'pdf',
    },
  };

  if (options.format === 'pdf') {
    payload.pdf = isPrint
      ? { mode: 'print', title: options.title, banner: DEMO_BANNER }
      : {
          mode: 'viewport',
          title: options.title,
          banner: DEMO_BANNER,
          contentSelector: SHARED_ITEMS_CONTAINER_SELECTOR,
        };
  } else {
    // PNG is always preserve_layout in real Kibana (see plan notes). `mode`/`title`/`banner` are
    // pdf-only, but `contentSelector` is still honored for image output — it's what tells the
    // service what to measure and clip.
    payload.pdf = { contentSelector: SHARED_ITEMS_CONTAINER_SELECTOR };
  }

  return { payload, droppedUrlCount };
}
