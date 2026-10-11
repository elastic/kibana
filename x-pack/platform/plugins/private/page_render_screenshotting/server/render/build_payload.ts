/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import {
  HTTPAuthorizationHeader,
  isExternalUiamCredential,
  isUiamCredential,
} from '@kbn/core-security-server';
import { KBN_SCREENSHOT_MODE_ENABLED_KEY } from '@kbn/screenshot-mode-plugin/common';
import type { ScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import type { RenderPageRequest } from './types';

// Not exported by screenshot_mode.
const KBN_SCREENSHOT_CONTEXT_KEY = '__KBN_SCREENSHOT_CONTEXT__';

const KBN_APP_WRAPPER_SELECTOR = '.kbnAppWrapper';
const SHARED_ITEM_SELECTOR = '[data-shared-item]';
const SHARED_ITEMS_CONTAINER_SELECTOR = '[data-shared-items-container]';
const SHARED_ITEMS_COUNT_ATTRIBUTE = 'data-shared-items-count';
const RENDER_COMPLETE_ATTRIBUTE = 'data-render-complete';
const RENDER_ERROR_ATTRIBUTE = 'data-render-error';

// Same as the screenshotting plugin's default viewport. Deliberately fixed, ignoring
// `layout.dimensions`: at this width the layout no longer reflows, and it bounds the document size.
const DEFAULT_VIEWPORT = { width: 1950, height: 1200 };

// Same as the screenshotting plugin's preserve_layout.css. Not used for the print layout.
const PRESERVE_LAYOUT_CSS = `
.hide-for-sharing { display: none !important; }
.stretch-for-sharing { margin: 0px; }
#globalBannerList { display: none; }
.lnsWorkspacePanelWrapper__contentFlexGroup { display: block !important; }
.lnsVisualizationWorkspace_container { padding: 0 !important; border: 0 !important; }
`.trim();

/** Init script that defines a global before page scripts run. Injected by the browser, not `eval`, so it is CSP-safe. */
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

    const uiam = security.authc.apiKeys.uiam;
    // Externally created UIAM keys are not internal callers: UIAM rejects them when paired with the
    // attestation, so they are forwarded as-is.
    if (
      uiam &&
      isUiamCredential(authHeader) &&
      !isExternalUiamCredential(request) &&
      !uiam.isExternalApiKey(request)
    ) {
      Object.assign(headers, uiam.getInternalCallerAttestationHeaders(authHeader));
    }
  }

  const cookie = request.headers.cookie;
  if (typeof cookie === 'string') {
    headers.cookie = cookie;
  }

  return headers;
}

/** The service renders one page per request. */
function getSingleUrl(urls: ScreenshotOptions['urls'] = []): {
  url: string;
  context: Record<string, unknown>;
} {
  if (urls.length !== 1) {
    throw new Error(`page-render-service renders exactly one URL per report, got ${urls.length}`);
  }
  const [first] = urls;
  if (typeof first === 'string') {
    return { url: first, context: {} };
  }
  const [url, context] = first;
  return { url, context };
}

/** Replaces the origin of `url` with that of `captureBaseUrl`. Returns `url` unchanged if either does not parse. */
export function withCaptureOrigin(url: string, captureBaseUrl?: string): string {
  if (!captureBaseUrl) {
    return url;
  }
  try {
    const target = new URL(url);
    const { origin } = new URL(captureBaseUrl);
    return `${origin}${target.pathname}${target.search}${target.hash}`;
  } catch {
    return url;
  }
}

export function buildRenderPageRequest(
  options: ScreenshotOptions,
  security: SecurityServiceStart,
  captureBaseUrl?: string
): RenderPageRequest {
  const { url: rawUrl, context } = getSingleUrl(options.urls);

  const layoutId = options.layout?.id ?? 'preserve_layout';
  const isPrint = options.format === 'pdf' && layoutId === 'print';

  const requestHeaders = options.headers
    ? Object.fromEntries(
        Object.entries(options.headers)
          .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
          .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])
      )
    : undefined;

  const payload: RenderPageRequest = {
    url: withCaptureOrigin(rawUrl, captureBaseUrl),
    pageAuth: { headers: getRequestAuthHeaders(options.request, security) },
    requestHeaders,
    onNewDocumentScripts: [
      defineGlobal(KBN_SCREENSHOT_MODE_ENABLED_KEY, true),
      defineGlobal(KBN_SCREENSHOT_CONTEXT_KEY, { ...context, layout: layoutId }),
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
      ? { mode: 'print', title: options.title }
      : {
          mode: 'viewport',
          title: options.title,
          contentSelector: SHARED_ITEMS_CONTAINER_SELECTOR,
        };
  } else {
    // The service also uses `contentSelector` to clip image output.
    payload.pdf = { contentSelector: SHARED_ITEMS_CONTAINER_SELECTOR };
  }

  return payload;
}
