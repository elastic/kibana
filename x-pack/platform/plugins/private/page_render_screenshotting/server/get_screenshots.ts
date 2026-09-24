/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { map } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SystemIdentity } from '@kbn/security-plugin-types-server';
import type {
  PdfScreenshotResult,
  PngScreenshotResult,
  ScreenshotOptions,
  ScreenshotResult,
} from '@kbn/screenshotting-plugin/server';
import type { PluginConfig } from './config';
import { buildRenderPageRequest } from './render/build_payload';
import { renderPage } from './render/client';
import type { RenderPageResult } from './render/types';

/**
 * Structurally identical to `ScreenshottingStart` (`@kbn/screenshotting-plugin/server`) — reporting
 * prefers this contract over the real one when this plugin is enabled (see reporting's
 * `server/plugin.ts`). Only the `urls`-based dashboard/visualization capture path is implemented;
 * expression-based (Canvas) input is not supported.
 */
export interface PageRenderScreenshottingStart {
  getScreenshots(options: ScreenshotOptions): Rx.Observable<ScreenshotResult>;
}

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
  config,
  logger,
  security,
  getCaptureBaseUrl = () => undefined,
  getSystemIdentity,
  getDispatcher = () => undefined,
}: {
  config: PluginConfig;
  logger: Logger;
  security: SecurityServiceStart;
  /** Resolved per call: the security plugin's start contract does not exist at setup. */
  getSystemIdentity: () => SystemIdentity | undefined;
  /** Presents Kibana's client certificate. Resolved per call: see `render/dispatcher.ts`. */
  getDispatcher?: () => unknown;
  /** Origin substituted into capture URLs so the remote render service can reach Kibana —
   * `xpack.pageRenderScreenshotting.kibanaBaseUrl` if set, else `server.publicBaseUrl`. Resolved
   * per call because `kibanaBaseUrl` is dynamically overridable. See the note in
   * `server/plugin.ts`. */
  getCaptureBaseUrl?: () => string | undefined;
}): PageRenderScreenshottingStart['getScreenshots'] {
  return function getScreenshots(options: ScreenshotOptions): Rx.Observable<ScreenshotResult> {
    if (options.expression) {
      return Rx.throwError(
        () =>
          new Error(
            'pageRenderScreenshotting does not support expression-based (Canvas) capture (dashboard PDF/PNG export only)'
          )
      );
    }

    if (!config.url) {
      return Rx.throwError(() => new Error('xpack.pageRenderScreenshotting.url is not configured'));
    }

    let payload;
    let droppedUrlCount;
    try {
      ({ payload, droppedUrlCount } = buildRenderPageRequest(
        options,
        security,
        getCaptureBaseUrl()
      ));
    } catch (err) {
      return Rx.throwError(() => err);
    }

    if (droppedUrlCount > 0) {
      logger.warn(
        `getScreenshots() was called with ${
          droppedUrlCount + 1
        } URLs; page-render-service only supports one page per call — rendering the first and dropping the rest.`
      );
    }

    const result$ = renderPage(
      payload,
      {
        url: config.url,
        createToken: async (signal) => {
          const systemIdentity = getSystemIdentity();
          if (!systemIdentity) {
            throw new Error(
              'Cannot authenticate to page-render-service: xpack.pageRenderScreenshotting is enabled but UIAM is not configured for this Kibana.'
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
      ? result$.pipe(map(toPngResult))
      : result$.pipe(map(toPdfResult));
  };
}
