/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mirrors page-render-service's `POST /v1/render-page` Zod request schema
 * (`page-render-service/src/routes/render.ts`). Hand-written rather than shared, since the
 * service is a standalone, Kibana-agnostic repo (see AGENTS.md in the MT Reporting workspace) —
 * keep this in sync with the service's schema if it changes.
 */
export interface RenderPageRequest {
  url: string;
  pageAuth?: {
    headers?: Record<string, string>;
  };
  requestHeaders?: Record<string, string>;
  onNewDocumentScripts?: string[];
  css?: string;
  waitFor?: {
    pageLoadSelector?: string;
    itemSelector?: string;
    itemsCountAttribute?: string;
    renderCompleteAttribute?: string;
    renderErrorAttribute?: string;
    timeouts?: {
      pageLoadMs?: number;
      elementsMs?: number;
      renderCompleteMs?: number;
    };
  };
  browser?: {
    viewport?: {
      width: number;
      height: number;
      deviceScaleFactor?: number;
    };
    timezone?: string;
  };
  pdf?: {
    mode?: 'viewport' | 'print';
    title?: string;
    banner?: string;
    contentSelector?: string;
  };
  output?: {
    format?: 'pdf' | 'png' | 'jpeg';
    quality?: number;
    scale?: 'css' | 'device';
  };
}

/** Shape of a non-2xx JSON error body from the service (`RenderErrorResponse` / `ServiceErrorResponse`). */
export interface RenderPageErrorBody {
  error: string;
  phase?:
    | 'navigation'
    | 'page-load'
    | 'elements'
    | 'render-complete'
    | 'inject'
    | 'pdf'
    | 'unknown';
  documentStatus?: number;
}

/** Result of a successful render, after any 429 retries. */
export interface RenderPageResult {
  data: Buffer;
  renderErrors: string[];
}
