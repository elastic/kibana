/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { Dispatcher } from 'undici';
import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SystemIdentity } from '@kbn/security-plugin-types-server';
import type {
  PdfScreenshotOptions,
  PdfScreenshotResult,
  PngScreenshotOptions,
  PngScreenshotResult,
  ScreenshotOptions,
  ScreenshotResult,
  ScreenshottingStart,
} from '@kbn/screenshotting-plugin/server';
import { buildRenderPageRequest } from './render/build_payload';
import { renderPage } from './render/client';
import type { RenderPageResult } from './render/types';

/** Drop-in replacement for the `screenshotting` plugin's start contract. */
export type PageRenderScreenshottingStart = ScreenshottingStart;

/** There is no local browser to diagnose. */
export const diagnose: ScreenshottingStart['diagnose'] = () =>
  Rx.of('Browser diagnostics are not available: pages are rendered by page-render-service.');

function toPdfResult(result: RenderPageResult): PdfScreenshotResult {
  return {
    data: result.data,
    errors: [],
    renderErrors: result.renderErrors,
    metrics: {},
  };
}

function toPngResult(result: RenderPageResult): PngScreenshotResult {
  return {
    metrics: {},
    results: [
      {
        timeRange: null,
        screenshots: [{ data: result.data, title: null, description: null }],
        renderErrors: result.renderErrors,
      },
    ],
  };
}

export function createGetScreenshots({
  getServiceUrl,
  logger,
  security,
  getCaptureBaseUrl = () => undefined,
  getSystemIdentity,
  getDispatcher = () => undefined,
}: {
  getServiceUrl: () => string | undefined;
  logger: Logger;
  security: SecurityServiceStart;
  getCaptureBaseUrl?: () => string | undefined;
  getSystemIdentity: () => SystemIdentity | undefined;
  getDispatcher?: () => Dispatcher | undefined;
}): ScreenshottingStart['getScreenshots'] {
  function getScreenshots(options: PngScreenshotOptions): Rx.Observable<PngScreenshotResult>;
  function getScreenshots(options: PdfScreenshotOptions): Rx.Observable<PdfScreenshotResult>;
  function getScreenshots(options: ScreenshotOptions): Rx.Observable<ScreenshotResult>;
  function getScreenshots(options: ScreenshotOptions): Rx.Observable<ScreenshotResult> {
    if (options.expression) {
      return Rx.throwError(
        () => new Error('Expression-based (Canvas) capture is not supported by page-render-service')
      );
    }

    const url = getServiceUrl();
    if (!url) {
      return Rx.throwError(() => new Error('xpack.pageRenderScreenshotting.url is not configured'));
    }

    return Rx.defer(() => {
      const payload = buildRenderPageRequest(options, security, getCaptureBaseUrl());
      const result$ = renderPage(
        payload,
        {
          url,
          createToken: async (signal) => {
            const systemIdentity = getSystemIdentity();
            if (!systemIdentity) {
              throw new Error(
                'Cannot authenticate to page-render-service: xpack.security.uiam is not configured'
              );
            }
            return systemIdentity.createEphemeralToken(signal);
          },
          dispatcher: getDispatcher(),
        },
        options.taskInstanceFields.retryAt,
        logger
      );

      return options.format === 'png'
        ? result$.pipe(Rx.map(toPngResult))
        : result$.pipe(Rx.map(toPdfResult));
    });
  }

  return getScreenshots;
}
