/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { toKibanaChartsRenderContext } from '@kbn/isomer';
import {
  MATERIALIZE_FEATURE_FLAG,
  RENDER_PNG_API_PATH,
  RENDER_PNG_API_VERSION,
} from '../../common/constants';
import { abortSignalFor } from '../materialize/abort_signal';
import type { MaterializeScope, ScopedMaterializeClient } from '../materialize/types';
import type { ChartPngHost } from '../render/png_host';
import { RenderInputError } from '../render/png_host';
import { RenderBusyError } from '../render/limiter';
import { toContext } from './materialize_route';
import { renderPngRequestBodySchema } from './schemas';

interface RenderPngRouteDeps {
  router: IRouter;
  createClient: (scope: MaterializeScope) => ScopedMaterializeClient;
  getPngHost: () => ChartPngHost;
}

/**
 * Registers the internal route that materializes content, such as a Lens ES|QL chart's config,
 * and draws it to a PNG in Kibana's process. Off with materialization.
 */
export const registerRenderPngRoute = ({
  router,
  createClient,
  getPngHost,
}: RenderPngRouteDeps) => {
  router.versioned
    .post({
      path: RENDER_PNG_API_PATH,
      access: 'internal',
      summary: 'Materialize content and draw it to a PNG',
      security: {
        authz: {
          enabled: false,
          reason:
            'Materialization runs as the requesting user: saved objects load through the scoped saved objects client and queries run through the scoped Elasticsearch client. Drawing reads only the materialized node.',
        },
      },
    })
    .addVersion(
      {
        version: RENDER_PNG_API_VERSION,
        validate: { request: { body: renderPngRequestBodySchema } },
      },
      async (context, request, response) => {
        const { featureFlags, savedObjects, uiSettings } = await context.core;
        if (!(await featureFlags.getBooleanValue(MATERIALIZE_FEATURE_FLAG, false))) {
          return response.notFound();
        }
        const { input, context: materializeContext, image = {} } = request.body;
        const settings = uiSettings.client;
        const [darkMode, numberLocale, dateFormatTz] = await Promise.all([
          settings.get<boolean | string>('theme:darkMode'),
          settings.get<string>(FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE),
          settings.get<string>('dateFormat:tz'),
        ]);
        const renderContext = toKibanaChartsRenderContext({
          darkMode,
          numberLocale,
          dateFormatTz: materializeContext?.time_zone ?? dateFormatTz,
        });
        const client = createClient({
          request,
          savedObjectsClient: savedObjects.client,
          abortSignal: abortSignalFor(request),
        });
        const node = await client.materialize(input, toContext(materializeContext));
        try {
          const { png, width, height, scale, metrics } = await getPngHost().renderPng(node, {
            ...renderContext,
            ...(image.scheme ? { scheme: image.scheme } : {}),
            ...(image.scale ? { scale: image.scale } : {}),
            ...(image.width ? { width: image.width } : {}),
          });
          return response.ok({
            body: png,
            headers: {
              'content-type': 'image/png',
              'x-isomer-node-type': node.type,
              'x-isomer-image-size': `${width}x${height}@${scale}x`,
              'x-isomer-render-ms': String(metrics.duration_ms),
            },
          });
        } catch (error) {
          if (error instanceof RenderBusyError) {
            return response.customError({
              statusCode: 429,
              body: { message: error.message },
              headers: { 'retry-after': '1' },
            });
          }
          if (error instanceof RenderInputError) {
            return response.badRequest({ body: { message: error.message } });
          }
          throw error;
        }
      }
    );
};
