/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Request body of page-render-service's `POST /v1/render-page`. Keep in sync with the service. */
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

/** JSON body of a non-2xx response. */
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

/** A successful render. */
export interface RenderPageResult {
  data: Buffer;
  renderErrors: string[];
}
