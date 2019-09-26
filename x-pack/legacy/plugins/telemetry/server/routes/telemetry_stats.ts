/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { boomify } from 'boom';
import { CoreSetup } from 'src/core/server';
import { getStats, encryptTelemetry } from '../collectors';

export function registerTelemetryDataRoutes(core: CoreSetup) {
  const { server } = core.http as any;

  server.route({
    method: 'POST',
    path: '/api/telemetry/v2/clusters/_stats',
    config: {
      validate: {
        payload: Joi.object({
          unencrypted: Joi.bool(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required(),
          }).required(),
        }),
      },
    },
    handler: async (req: any, h: any) => {
      const config = req.server.config();
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;
      const unencrypted = req.payload.unencrypted;
      const isDev = config.get('env.dev');

      try {
        const usageData = await getStats(req, config, start, end, unencrypted);
        if (unencrypted) return usageData;
        return encryptTelemetry(usageData, isDev);
      } catch (err) {
        if (isDev) {
          // don't ignore errors when running in dev mode
          return boomify(err, { statusCode: err.status });
        } else {
          const statusCode = unencrypted && err.status === 403 ? 403 : 200;
          // ignore errors and return empty set
          return h.response([]).code(statusCode);
        }
      }
    },
  });
}
