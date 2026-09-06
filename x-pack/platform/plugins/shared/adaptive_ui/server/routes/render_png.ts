/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { parseViewSpec, validateView } from '@kbn/adaptive-ui';
import { adaptiveUiApiPaths, MAX_VIEW_SPEC_BYTES } from '../../common/http_api';

export const registerRenderPngRoute = ({
  router,
  logger,
}: {
  router: IRouter;
  logger: Logger;
}): void => {
  router.post(
    {
      path: adaptiveUiApiPaths.renderPng,
      security: {
        authz: {
          enabled: false,
          reason:
            'Rasterizes a ViewSpec supplied in the request body. It reads no Kibana data, so possession of the spec is the only authorization the render needs.',
        },
      },
      validate: {
        body: schema.object({
          spec: schema.recordOf(schema.string(), schema.any()),
        }),
      },
      options: { body: { maxBytes: MAX_VIEW_SPEC_BYTES } },
    },
    async (_context, request, response) => {
      const parsed = parseViewSpec(request.body.spec);
      const view = parsed.spec;
      const validation = view ? validateView(view) : parsed;
      if (!view || !validation.valid) {
        return response.badRequest({
          body: { message: `Invalid ViewSpec: ${validation.errors.join('; ')}` },
        });
      }

      // `@kbn/adaptive-ui/node` pulls in the native `@takumi-rs/core` binding;
      // a Kibana that never exports a PNG should never load it.
      const { renderPNG } = await import('@kbn/adaptive-ui/node');

      try {
        const { png } = await renderPNG(view);
        return response.ok({
          body: png,
          headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
        });
      } catch (error) {
        logger.error(`Adaptive UI PNG render failed: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Could not render this view as a PNG.' },
        });
      }
    }
  );
};
