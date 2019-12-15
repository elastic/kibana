/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';
import { upsertUIReindexOption } from '../lib/telemetry/es_ui_reindex_apis';
import { ServerShimWithRouter } from '../types';
import { createRequestShim } from './create_request_shim';

export function registerTelemetryRoutes(server: ServerShimWithRouter) {
  server.router.put(
    {
      path: '/api/upgrade_assistant/telemetry/ui_open',
      validate: {
        body: schema.object({
          overview: schema.boolean({ defaultValue: false }),
          cluster: schema.boolean({ defaultValue: false }),
          indices: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (ctx, request, response) => {
      const reqShim = createRequestShim(request);
      try {
        return response.ok({ body: await upsertUIOpenOption(server, reqShim) });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );

  server.router.put(
    {
      path: '/api/upgrade_assistant/telemetry/ui_reindex',
      validate: {
        body: schema.object({
          close: schema.boolean({ defaultValue: false }),
          open: schema.boolean({ defaultValue: false }),
          start: schema.boolean({ defaultValue: false }),
          stop: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (ctx, request, response) => {
      const reqShim = createRequestShim(request);
      try {
        return response.ok({ body: await upsertUIReindexOption(server, reqShim) });
      } catch (e) {
        return response.internalError({ body: e });
      }
    }
  );
}
